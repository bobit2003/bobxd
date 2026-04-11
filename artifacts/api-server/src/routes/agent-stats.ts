import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, clients, leads, invoices, conversations, events, projects, timeEntries, automations, memories } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/agent-stats", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

    const [
      allTasks, allClients, allLeads, allInvoices,
      allConversations, allEvents, allProjects,
      allTime, allAutomations, allMemories
    ] = await Promise.all([
      db.select().from(tasks), db.select().from(clients), db.select().from(leads),
      db.select().from(invoices), db.select().from(conversations),
      db.select().from(events).orderBy(desc(events.createdAt)),
      db.select().from(projects), db.select().from(timeEntries),
      db.select().from(automations), db.select().from(memories),
    ]);

    const pending = allTasks.filter(t => t.status !== "done");
    const overdue = pending.filter(t => t.dueDate && new Date(t.dueDate) < todayStart);
    const todayTasks = pending.filter(t => t.dueDate && new Date(t.dueDate) >= todayStart);
    const paid = allInvoices.filter(i => i.status === "paid");
    const totalRevenue = paid.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const unpaidAmt = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const weekHours = allTime.filter(t => t.billable === "true" && t.date && new Date(t.date) >= weekStart).reduce((s, t) => s + parseFloat(t.hours || "0"), 0);
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");
    const activeClients = allClients.filter(c => c.status === "active");
    const weekEvents = allEvents.filter(e => new Date(e.createdAt) >= weekStart);
    const activeAuto = allAutomations.filter(a => a.status === "active");

    const nodes = [
      {
        id: "ceo", label: "CEO Agent", domain: "strategy", color: "violet",
        stats: { pendingTasks: pending.length, overdueTasks: overdue.length, activeProjects: allProjects.filter(p => p.status === "active").length },
        status: "active" as const,
      },
      {
        id: "revenue", label: "Revenue Agent", domain: "money", color: "amber",
        stats: { totalRevenue, unpaidAmount: unpaidAmt, hotLeads: hotLeads.length, activeClients: activeClients.length },
        status: unpaidAmt > 0 ? "alert" as const : "active" as const,
      },
      {
        id: "ops", label: "Ops Agent", domain: "execution", color: "blue",
        stats: { tasksToday: todayTasks.length, tasksPending: pending.length, overdueTasks: overdue.length, completedTasks: allTasks.filter(t => t.status === "done").length },
        status: overdue.length > 0 ? "alert" as const : "active" as const,
      },
      {
        id: "analytics", label: "Analytics Agent", domain: "data", color: "cyan",
        stats: { weekEvents: weekEvents.length, weekBillableHours: Math.round(weekHours * 10) / 10, totalConversations: allConversations.length, totalMemories: allMemories.length },
        status: "active" as const,
      },
      {
        id: "automation", label: "Automation Agent", domain: "automation", color: "green",
        stats: { activeAutomations: activeAuto.length, totalAutomations: allAutomations.length },
        status: activeAuto.length > 0 ? "active" as const : "idle" as const,
      },
      {
        id: "mjscope", label: "MJ Scope", domain: "client", color: "amber",
        stats: { totalRevenue: paid.filter(i => (i as any).clientId === 1).reduce((s, i) => s + parseFloat(i.amount || "0"), 0), tasks: pending.filter(t => (t as any).clientId === 1).length },
        status: "active" as const,
      },
      {
        id: "zaynscope", label: "ZaynScope", domain: "client", color: "blue",
        stats: { totalRevenue: paid.filter(i => (i as any).clientId === 2).reduce((s, i) => s + parseFloat(i.amount || "0"), 0), tasks: pending.filter(t => (t as any).clientId === 2).length },
        status: "active" as const,
      },
      {
        id: "boba", label: "BOBA", domain: "agent", color: "violet",
        stats: { memories: allMemories.length, conversations: allConversations.length, eventsToday: weekEvents.length },
        status: "active" as const,
      },
    ];

    res.json({ nodes, updatedAt: now.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get agent stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
