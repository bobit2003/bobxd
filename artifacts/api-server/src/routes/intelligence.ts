import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, leads, invoices, milestones, clients, timeEntries, habits } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Daily strategic plan — SSE stream
router.get("/intelligence/daily-plan", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

    // Gather all relevant data
    const allTasks = await db.select().from(tasks);
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.status !== "done" && t.dueDate < todayStart
    );
    const highPriTasks = allTasks.filter((t) => t.status !== "done" && t.priority === "high");
    const todayTasks = allTasks.filter(
      (t) =>
        t.dueDate &&
        t.status !== "done" &&
        t.dueDate >= todayStart &&
        t.dueDate < new Date(todayStart.getTime() + 86400000)
    );

    const allLeads = await db.select().from(leads);
    const hotLeads = allLeads.filter(
      (l) => l.score === "hot" && l.stage !== "won" && l.stage !== "lost"
    );
    const staleLeads = allLeads.filter((l) => {
      if (l.stage === "won" || l.stage === "lost") return false;
      const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    });

    const allInvoices = await db.select().from(invoices);
    const unpaidInvs = allInvoices.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled"
    );
    const overdueInvs = unpaidInvs.filter(
      (i) => i.dueDate && new Date(i.dueDate) < todayStart
    );
    const unpaidAmount = unpaidInvs.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    const allMilestones = await db.select().from(milestones);
    const upcomingMs = allMilestones
      .filter((m) => m.status !== "completed" && m.dueDate)
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 5);

    const allClients = await db.select().from(clients);
    const allTime = await db.select().from(timeEntries);
    const weeklyBillable = allTime
      .filter((t) => t.billable === "true" && t.date >= weekStart)
      .reduce((s, t) => s + parseFloat(t.hours || "0"), 0);

    const allHabits = await db.select().from(habits);
    const habitsDueToday = allHabits.filter((h) => {
      if (!h.lastCompleted) return true;
      const last = new Date(h.lastCompleted);
      return last < todayStart;
    });

    // Build the intelligence prompt
    const contextBlock = `
CURRENT SYSTEM STATE (${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}):

TASKS:
- Overdue: ${overdueTasks.length} tasks (${overdueTasks.slice(0, 3).map((t) => t.title).join(", ") || "none"})
- High priority pending: ${highPriTasks.length} (${highPriTasks.slice(0, 3).map((t) => t.title).join(", ") || "none"})
- Due today: ${todayTasks.length}

REVENUE:
- Hot leads: ${hotLeads.length} (${hotLeads.slice(0, 3).map((l) => `${l.name}${l.budget ? " $" + l.budget : ""}`).join(", ") || "none"})
- Stale leads (7+ days idle): ${staleLeads.length} (${staleLeads.slice(0, 3).map((l) => l.name).join(", ") || "none"})
- Unpaid invoices: ${unpaidInvs.length} totaling $${unpaidAmount.toFixed(0)}
- Overdue invoices: ${overdueInvs.length}
- Total clients: ${allClients.length}

TIME & MILESTONES:
- Billable hours this week: ${weeklyBillable.toFixed(1)}h
- Upcoming milestones: ${upcomingMs.map((m) => `${m.title} (${m.dueDate?.toLocaleDateString()})`).join(", ") || "none"}

HABITS:
- Habits not logged today: ${habitsDueToday.length} of ${allHabits.length}
`.trim();

    const systemPrompt = `You are OpenClaw — the Revenue Engine and CEO Agent of an AI operating system.
Generate a structured daily strategic plan based on the real system state provided.
Output EXACTLY in this format, no deviation:

DAILY STRATEGY PLAN
===================

TOP 3 REVENUE TASKS
[list exactly 3, each on a new line starting with "- "]

TOP 3 OPERATIONAL TASKS
[list exactly 3, each on a new line starting with "- "]

CLIENT FOLLOW-UPS
[list specific clients/leads to contact, each on a new line starting with "- ". If none, say "- No urgent follow-ups identified."]

RISKS & WARNINGS
[list specific risks, each on a new line starting with "- "]

FAST MONEY OPPORTUNITIES
[list 2-3 immediate revenue actions, each on a new line starting with "- "]

Be specific. Use real names and numbers from the data. No vague advice.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextBlock },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate daily plan");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate plan" })}\n\n`);
    res.end();
  }
});

export default router;
