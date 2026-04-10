import { Router } from "express";
import { db } from "@workspace/db";
import { projects, tasks, clients, automations, conversations } from "@workspace/db";
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
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
