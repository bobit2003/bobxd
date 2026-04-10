import { Router } from "express";
import { db } from "@workspace/db";
import { projects, tasks, clients, automations, conversations, leads, invoices, timeEntries, contentItems, milestones } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [totalProjects] = await db.select({ count: count() }).from(projects);
    const [activeProjects] = await db.select({ count: count() }).from(projects).where(eq(projects.status, "active"));
    const [totalTasks] = await db.select({ count: count() }).from(tasks);
    const [pendingTasks] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "todo"));
    const [inProgressTasks] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "in_progress"));
    const [completedTasks] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "done"));
    const [totalClients] = await db.select({ count: count() }).from(clients);
    const [activeClients] = await db.select({ count: count() }).from(clients).where(eq(clients.status, "active"));
    const [totalAutomations] = await db.select({ count: count() }).from(automations);
    const [activeAutomations] = await db.select({ count: count() }).from(automations).where(eq(automations.status, "active"));
    const [totalConversations] = await db.select({ count: count() }).from(conversations);

    const allLeads = await db.select().from(leads);
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost").length;

    const allInvoices = await db.select().from(invoices);
    const paidRevenue = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const unpaidAmt = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    const allTime = await db.select().from(timeEntries);
    const billableHrs = allTime.filter(t => t.billable === "true").reduce((s, t) => s + parseFloat(t.hours || "0"), 0);

    const [contentScheduled] = await db.select({ count: count() }).from(contentItems).where(eq(contentItems.status, "scheduled"));
    const [milestonesInProgress] = await db.select({ count: count() }).from(milestones).where(eq(milestones.status, "in_progress"));

    res.json({
      totalProjects: Number(totalProjects.count),
      activeProjects: Number(activeProjects.count),
      totalTasks: Number(totalTasks.count),
      pendingTasks: Number(pendingTasks.count) + Number(inProgressTasks.count),
      completedTasks: Number(completedTasks.count),
      totalClients: Number(totalClients.count),
      activeClients: Number(activeClients.count),
      totalAutomations: Number(totalAutomations.count),
      activeAutomations: Number(activeAutomations.count),
      totalConversations: Number(totalConversations.count),
      hotLeads,
      totalLeads: allLeads.length,
      revenue: paidRevenue.toFixed(2),
      unpaidAmount: unpaidAmt.toFixed(2),
      billableHours: billableHrs.toFixed(1),
      contentScheduled: Number(contentScheduled.count),
      milestonesInProgress: Number(milestonesInProgress.count),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
