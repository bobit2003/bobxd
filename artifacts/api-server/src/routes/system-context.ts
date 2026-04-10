import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, leads, invoices, clients, memories, events } from "@workspace/db";
import { desc, eq, lt } from "drizzle-orm";

const router = Router();

router.get("/system-context", async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      allTasks,
      allLeads,
      allInvoices,
      allClients,
      allMemories,
      recentEvents,
    ] = await Promise.all([
      db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(100),
      db.select().from(leads).orderBy(desc(leads.createdAt)),
      db.select().from(invoices).orderBy(desc(invoices.createdAt)),
      db.select().from(clients).orderBy(desc(clients.createdAt)),
      db.select().from(memories).orderBy(desc(memories.createdAt)).limit(10),
      db.select().from(events).orderBy(desc(events.createdAt)).limit(20),
    ]);

    // Revenue metrics
    const paidInvoices = allInvoices.filter(i => i.status === "paid");
    const unpaidInvoices = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
    const totalRevenue = paidInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const totalUnpaid = unpaidInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const overdueCount = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) < today).length;

    // Lead stats
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "won" || l.stage === "lost") return false;
      const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return lastUpdate < sevenDaysAgo;
    });
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");

    // Task stats
    const pendingTasks = allTasks.filter(t => t.status !== "done");
    const highPriorityTasks = pendingTasks.filter(t => t.priority === "high");
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);

    // Reactivation targets
    const reactivationTargets = allClients.filter(c => {
      const clientPaid = paidInvoices.filter(i => i.clientId === c.id);
      if (clientPaid.length === 0) return false;
      const lastPaid = clientPaid.reduce((latest, inv) => {
        const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.updatedAt);
        return d > latest ? d : latest;
      }, new Date(0));
      return lastPaid < thirtyDaysAgo;
    });

    res.json({
      timestamp: now.toISOString(),
      revenue: {
        total: totalRevenue,
        unpaid: totalUnpaid,
        overdueCount,
        paidInvoiceCount: paidInvoices.length,
      },
      clients: {
        total: allClients.length,
        active: allClients.filter(c => c.status === "active").length,
        reactivationTargets: reactivationTargets.length,
      },
      leads: {
        total: allLeads.length,
        hot: hotLeads.length,
        stale: staleLeads.length,
        active: allLeads.filter(l => l.stage !== "won" && l.stage !== "lost").length,
      },
      tasks: {
        total: allTasks.length,
        pending: pendingTasks.length,
        highPriority: highPriorityTasks.length,
        overdue: overdueTasks.length,
      },
      recentEvents: recentEvents.map(e => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
      topMemories: allMemories.map(m => ({
        id: m.id,
        content: m.content,
        category: m.category,
        importance: m.importance,
      })),
      alerts: [
        ...(overdueCount > 0 ? [{ type: "overdue_invoice", message: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""}`, urgency: "high" as const }] : []),
        ...(staleLeads.length > 0 ? [{ type: "stale_leads", message: `${staleLeads.length} lead${staleLeads.length > 1 ? "s" : ""} need follow-up`, urgency: "medium" as const }] : []),
        ...(highPriorityTasks.length > 0 ? [{ type: "high_priority_tasks", message: `${highPriorityTasks.length} high-priority task${highPriorityTasks.length > 1 ? "s" : ""} pending`, urgency: "high" as const }] : []),
        ...(reactivationTargets.length > 0 ? [{ type: "reactivation", message: `${reactivationTargets.length} client${reactivationTargets.length > 1 ? "s" : ""} ready for reactivation`, urgency: "medium" as const }] : []),
        ...(overdueTasks.length > 0 ? [{ type: "overdue_tasks", message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, urgency: "high" as const }] : []),
      ],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get system context");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
