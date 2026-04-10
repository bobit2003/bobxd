import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, projects, habits, goals, leads, invoices, timeEntries, milestones, contentItems } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

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
  "Revenue is the ultimate validation.",
  "Every empire was built one brick at a time.",
];

router.get("/briefing", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);
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

    const allInvoices = await db.select().from(invoices);
    const unpaidInvs = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
    const unpaidAmount = unpaidInvs.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    const allLeads = await db.select().from(leads);
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost").length;
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "won" || l.stage === "lost") return false;
      const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24) > 7;
    }).length;

    const allTime = await db.select().from(timeEntries);
    const weeklyBillable = allTime
      .filter(t => t.billable === "true" && t.date >= weekStart)
      .reduce((s, t) => s + parseFloat(t.hours || "0"), 0);

    const allMilestones = await db.select().from(milestones);
    const upcomingMs = allMilestones
      .filter(m => m.status !== "completed" && m.dueDate)
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 3)
      .map(m => `${m.title} (due ${m.dueDate!.toLocaleDateString()})`);

    const allContent = await db.select().from(contentItems);
    const upcomingContent = allContent
      .filter(c => c.status === "scheduled" && c.scheduledDate)
      .sort((a, b) => (a.scheduledDate?.getTime() || 0) - (b.scheduledDate?.getTime() || 0))
      .slice(0, 3)
      .map(c => `${c.title} on ${c.platform} (${c.scheduledDate!.toLocaleDateString()})`);

    // Build AI narrative from real data
    let aiInsight = "";
    try {
      const dataContext = `System snapshot: ${tasksOverdue} overdue tasks, ${tasksDueToday} due today, ${highPriTasks.length} high-priority pending. Revenue: $${unpaidAmount.toFixed(0)} unpaid across ${unpaidInvs.length} invoices, ${hotLeads} hot leads, ${staleLeads} stale leads, ${weeklyBillable.toFixed(1)}h billable this week. Habits: ${habitRows.length} tracked, longest streak ${maxStreak} days. Active projects: ${activeProjectRows.length}.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 200,
        messages: [
          {
            role: "system",
            content: "You are the OpenClaw AI Operating System. Generate a concise 2-3 sentence strategic morning narrative — not a list, not bullet points — from the system snapshot. Be specific about numbers. Focus on what matters most today for revenue and momentum. Write in an assertive, commander-to-commander tone.",
          },
          { role: "user", content: dataContext },
        ],
      });
      aiInsight = completion.choices[0]?.message?.content ?? "";
    } catch {
      // Fallback to static insight if GPT fails
      const insights: string[] = [];
      if (tasksOverdue > 0) insights.push(`${tasksOverdue} overdue task(s) need attention.`);
      else insights.push("All tasks are on track.");
      if (unpaidInvs.length > 0) insights.push(`$${unpaidAmount.toFixed(0)} in unpaid invoices across ${unpaidInvs.length} invoice(s).`);
      if (hotLeads > 0) insights.push(`${hotLeads} hot lead(s) ready to close.`);
      if (weeklyBillable > 0) insights.push(`${weeklyBillable.toFixed(1)}h billable this week.`);
      if (habitRows.length > 0) insights.push(`Tracking ${habitRows.length} habit(s). Longest streak: ${maxStreak} day(s).`);
      aiInsight = insights.join(" ");
    }

    res.json({
      greeting: `${greeting}, Commander`,
      date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      tasksDueToday,
      tasksOverdue,
      activeProjects: activeProjectRows.length,
      currentStreak: maxStreak,
      topPriorities: highPriTasks.length > 0 ? highPriTasks : ["No high priority tasks. You're ahead of schedule."],
      aiInsight,
      quote: quotes[Math.floor(Math.random() * quotes.length)],
      unpaidInvoices: unpaidInvs.length,
      unpaidAmount: unpaidAmount.toFixed(2),
      hotLeads,
      billableHoursThisWeek: weeklyBillable.toFixed(1),
      upcomingMilestones: upcomingMs,
      upcomingContent: upcomingContent,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
