import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, leads, invoices, clients, events, directives, projects } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { emitEvent } from "../events.js";
import { writeAudit } from "../audit-writer.js";

const router = Router();

function serializeDate<T extends Record<string, any>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val instanceof Date) (obj as any)[key] = val.toISOString();
  }
  return obj;
}

function projectsSummary(items: any[]) {
  return items.map(i => ({
    id: i.id,
    title: i.title || i.name,
    dueDate: i.dueDate instanceof Date ? i.dueDate.toISOString() : i.dueDate,
    priority: i.priority,
    status: i.status,
    score: i.score,
    amount: i.amount,
  }));
}

// ─── CEO Priority Engine ───
// Returns the full "What should I do right now?" decision layer
router.get("/priority-engine", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [allTasks, allLeads, allInvoices, allClients, activeDirectives, activeEvents] = await Promise.all([
      db.select().from(tasks),
      db.select().from(leads),
      db.select().from(invoices),
      db.select().from(clients),
      db.select().from(directives).where(eq(directives.status, "active")).orderBy(desc(directives.createdAt)).limit(5),
      db.select().from(events).orderBy(desc(events.createdAt)).limit(10),
    ]);

    // ── Top 3 Revenue Actions ──
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");
    const overdueInvoices = allInvoices.filter(i =>
      i.status !== "paid" && i.status !== "cancelled" &&
      i.dueDate && new Date(i.dueDate) < todayStart
    );
    const unpaid = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
    const totalUnpaid = unpaid.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    const revenueActions = [
      ...hotLeads.slice(0, 2).map(l => ({
        id: l.id,
        type: "revenue" as const,
        action: `Follow up NOW with 🔥 hot lead: ${l.name}${l.budget ? ` — potential $${l.budget}` : ""}`,
        agent: "Revenue Agent",
        urgency: "high" as const,
        entityType: "lead",
        entityId: l.id,
      })),
      ...overdueInvoices.slice(0, 2).map(i => ({
        id: i.id,
        type: "revenue" as const,
        action: `Invoice #${i.invoiceNumber || i.id} is ${Math.floor((todayStart.getTime() - new Date(i.dueDate!).getTime()) / 86400000)} days overdue — $${i.amount} uncollected`,
        agent: "Revenue Agent",
        urgency: "high" as const,
        entityType: "invoice",
        entityId: i.id,
      })),
      {
        id: "unpaid-revenue",
        type: "revenue" as const,
        action: `$${totalUnpaid.toFixed(0)} in unpaid invoices outstanding — pursue collections`,
        agent: "Revenue Agent",
        urgency: overdueInvoices.length > 0 ? "high" as const : "medium" as const,
        entityType: null,
        entityId: null,
      },
    ];

    // ── Top 3 Urgent Tasks ──
    const overdueTasks = allTasks.filter(t =>
      t.status !== "done" && t.dueDate && new Date(t.dueDate) < todayStart
    );
    const highPriPending = allTasks.filter(t => t.status !== "done" && t.priority === "high" && (!t.dueDate || new Date(t.dueDate) >= todayStart));

    const urgentTasks = [
      ...overdueTasks.slice(0, 3).map(t => ({
        id: t.id,
        type: "task" as const,
        action: `⚠️ OVERDUE: ${t.title}`,
        agent: "Ops Agent",
        urgency: "critical" as const,
        entityType: "task",
        entityId: t.id,
      })),
      ...highPriPending.slice(0, 3 - overdueTasks.slice(0, 3).length).map(t => ({
        id: t.id,
        type: "task" as const,
        action: `High-priority: ${t.title}`,
        agent: "Ops Agent",
        urgency: "high" as const,
        entityType: "task",
        entityId: t.id,
      })),
    ];

    // ── Top 3 Risks ──
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "won" || l.stage === "lost") return false;
      const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return last < sevenDaysAgo;
    });
    const hotLeadsStale = hotLeads.filter(l => {
      const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return last < sevenDaysAgo;
    });

    const risks = [
      ...(overdueInvoices.length > 0 ? [{
        id: "risk-overdue-inv",
        type: "risk" as const,
        action: `${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""} — cash flow at risk`,
        agent: "Revenue Agent",
        severity: "high" as const,
      }] : []),
      ...(hotLeadsStale.length > 0 ? [{
        id: "risk-hot-cold",
        type: "risk" as const,
        action: `${hotLeadsStale.length} hot lead${hotLeadsStale.length > 1 ? "s" : ""} going cold — losing momentum`,
        agent: "Revenue Agent",
        severity: "high" as const,
      }] : []),
      ...(staleLeads.length > 3 ? [{
        id: "risk-pipeline",
        type: "risk" as const,
        action: `${staleLeads.length} stale leads risk dropping from pipeline — act or close`,
        agent: "Revenue Agent",
        severity: "medium" as const,
      }] : []),
    ];

    // ── Top 3 Opportunities ──
    const allProjects = await db.select().from(projects);
    const activeProjects = allProjects.filter(p => p.status === "active");

    const opportunities = [
      ...hotLeads.slice(0, 2).map(l => ({
        id: l.id,
        type: "opportunity" as const,
        action: `💰 Close ${l.name}${l.budget ? ` ($${l.budget} deal)` : " — high-intent lead"}`,
        agent: "Revenue Agent",
        potential: l.budget || null,
        entityType: "lead",
        entityId: l.id,
      })),
      {
        id: "opportunity-expansion",
        type: "opportunity" as const,
        action: `${activeProjects.length} active projects — identify upsell opportunities in ongoing work`,
        agent: "CEO Agent",
        potential: null,
        entityType: null,
        entityId: null,
      },
      ...(allClients.filter(c => c.status === "active").slice(0, 1).map(c => ({
        id: c.id,
        type: "opportunity" as const,
        action: `Long-term client base growing — consider retainer or subscription offer`,
        agent: "Revenue Agent",
        potential: null,
        entityType: "client",
        entityId: c.id,
      }))),
    ];

    const response = {
      timestamp: now.toISOString(),
      greeting: getGreeting(),
      headline: generateHeadline(revenueActions, urgentTasks, risks),
      revenueActions: revenueActions.slice(0, 3),
      urgentTasks: urgentTasks.slice(0, 3),
      risks: risks.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
      activeDirectives: activeDirectives.map(d => serializeDate({ ...d })),
      recentEvents: activeEvents.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })),
      // Quick stats
      stats: {
        tasksPending: allTasks.filter(t => t.status !== "done").length,
        tasksOverdue: overdueTasks.length,
        revenueUnpaid: totalUnpaid,
        revenueOverdue: overdueInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0),
        hotLeads: hotLeads.length,
        staleLeads: staleLeads.length,
        activeClients: allClients.filter(c => c.status === "active").length,
        activeProjects: activeProjects.length,
      }
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Priority engine failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Commander";
  if (h < 17) return "Good afternoon, Commander";
  return "Good evening, Commander";
}

function generateHeadline(revenue: any[], tasks: any[], risks: any[]) {
  const top = revenue.find(r => r.urgency === "high") || tasks.find(t => t.urgency === "critical");
  if (top) return top.action;
  const risk = risks[0];
  if (risk) return `⚠️ Watch: ${risk.action}`;
  return "All systems operational — execute your plan.";
}

export default router;
