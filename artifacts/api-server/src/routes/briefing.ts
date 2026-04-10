import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, projects, habits, goals } from "@workspace/db";
import { eq, and, lte, gte } from "drizzle-orm";

const router = Router();

const quotes = [
  "Ship fast, iterate faster.",
  "The best time to build was yesterday. The second best time is now.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements over time lead to stunning results.",
  "The only way to do great work is to love what you do.",
  "Execution eats strategy for breakfast.",
  "Done is better than perfect.",
  "Build things people want.",
];

router.get("/briefing", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const hour = now.getHours();

    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    const allTasks = await db.select().from(tasks);
    const tasksDueToday = allTasks.filter(t => {
      if (!t.dueDate || t.status === "done") return false;
      return t.dueDate >= todayStart && t.dueDate < todayEnd;
    }).length;

    const tasksOverdue = allTasks.filter(t => {
      if (!t.dueDate || t.status === "done") return false;
      return t.dueDate < todayStart;
    }).length;

    const activeProjectRows = await db.select().from(projects).where(eq(projects.status, "active"));
    const habitRows = await db.select().from(habits);
    const maxStreak = habitRows.reduce((max, h) => Math.max(max, h.streak), 0);

    const highPriTasks = allTasks
      .filter(t => t.status !== "done" && t.priority === "high")
      .slice(0, 3)
      .map(t => t.title);

    const insights = [
      tasksOverdue > 0 ? `You have ${tasksOverdue} overdue task(s) requiring attention.` : "All tasks are on track.",
      habitRows.length > 0 ? `You're tracking ${habitRows.length} habit(s). Keep the streaks alive.` : "Start tracking habits to build momentum.",
      activeProjectRows.length > 0 ? `${activeProjectRows.length} active project(s) in progress.` : "No active projects. Time to start building.",
    ];

    res.json({
      greeting: `${greeting}, Commander`,
      date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      tasksDueToday,
      tasksOverdue,
      activeProjects: activeProjectRows.length,
      currentStreak: maxStreak,
      topPriorities: highPriTasks.length > 0 ? highPriTasks : ["No high priority tasks. You're ahead of schedule."],
      aiInsight: insights.join(" "),
      quote: quotes[Math.floor(Math.random() * quotes.length)],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
