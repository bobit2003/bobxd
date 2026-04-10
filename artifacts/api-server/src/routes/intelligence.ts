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

// Revenue intelligence endpoint
router.get("/intelligence/revenue", async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allClients = await db.select().from(clients);
    const allInvoices = await db.select().from(invoices);
    const allLeads = await db.select().from(leads);

    // --- Client Rankings with lifetime value ---
    const clientRankings = allClients.map(c => {
      const clientPaidInvoices = allInvoices.filter(i => i.clientId === c.id && i.status === "paid");
      const lifetimeValue = clientPaidInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
      const lastInvoice = clientPaidInvoices.reduce((latest, inv) => {
        const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.updatedAt);
        return d > latest ? d : latest;
      }, new Date(0));

      let valueTier: "high" | "medium" | "low";
      if (lifetimeValue >= 5000) valueTier = "high";
      else if (lifetimeValue >= 1000) valueTier = "medium";
      else valueTier = "low";

      return {
        id: c.id,
        name: c.name,
        company: c.company ?? null,
        lifetimeValue,
        valueTier,
        lastInvoiceDate: lastInvoice.getTime() === 0 ? null : lastInvoice.toISOString(),
        paidInvoiceCount: clientPaidInvoices.length,
      };
    }).sort((a, b) => b.lifetimeValue - a.lifetimeValue);

    // --- Stale Leads: not updated in 7+ days, not won/lost ---
    const staleLeads = allLeads
      .filter(l => {
        if (l.stage === "won" || l.stage === "lost") return false;
        const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
        const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= 7;
      })
      .map(l => {
        const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
        const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: l.id,
          name: l.name,
          company: l.company ?? null,
          score: l.score,
          stage: l.stage,
          budget: l.budget ?? null,
          daysSinceUpdate,
        };
      })
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    // --- Overdue Collections: unpaid invoices past due date ---
    const overdueCollections = allInvoices
      .filter(i => i.status !== "paid" && i.status !== "cancelled" && i.dueDate && new Date(i.dueDate) < today)
      .map(i => {
        const client = allClients.find(c => c.id === i.clientId);
        const daysOverdue = Math.floor((now.getTime() - new Date(i.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          clientName: client?.name ?? "Unknown Client",
          amount: i.amount,
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // --- Reactivation Targets: clients with paid invoices but not in 30+ days ---
    const reactivationTargets = allClients
      .filter(c => {
        const clientPaidInvs = allInvoices.filter(i => i.clientId === c.id && i.status === "paid");
        if (clientPaidInvs.length === 0) return false;
        const lastPaid = clientPaidInvs.reduce((latest, inv) => {
          const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.updatedAt);
          return d > latest ? d : latest;
        }, new Date(0));
        return lastPaid < thirtyDaysAgo;
      })
      .map(c => {
        const clientPaidInvs = allInvoices.filter(i => i.clientId === c.id && i.status === "paid");
        const lifetimeValue = clientPaidInvs.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
        const lastPaid = clientPaidInvs.reduce((latest, inv) => {
          const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.updatedAt);
          return d > latest ? d : latest;
        }, new Date(0));
        const daysSinceLastInvoice = Math.floor((now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60 * 24));
        return { id: c.id, name: c.name, lifetimeValue, daysSinceLastInvoice };
      })
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

    // --- Opportunities: top actionable items ---
    const opportunities: { type: string; label: string; value: string; urgency: string }[] = [];

    // Overdue collections
    const totalOverdue = overdueCollections.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    if (overdueCollections.length > 0) {
      opportunities.push({
        type: "collection",
        label: `Collect $${totalOverdue.toFixed(0)} overdue across ${overdueCollections.length} invoice${overdueCollections.length > 1 ? "s" : ""}`,
        value: `$${totalOverdue.toFixed(0)}`,
        urgency: "high",
      });
    }

    // Hot stale leads
    const hotStaleLead = staleLeads.find(l => l.score === "hot");
    if (hotStaleLead) {
      opportunities.push({
        type: "lead_followup",
        label: `Follow up on hot lead ${hotStaleLead.name}${hotStaleLead.company ? ` (${hotStaleLead.company})` : ""} — ${hotStaleLead.daysSinceUpdate} days idle${hotStaleLead.budget ? `, $${hotStaleLead.budget}` : ""}`,
        value: hotStaleLead.budget ? `$${hotStaleLead.budget}` : "Unknown",
        urgency: "high",
      });
    } else if (staleLeads.length > 0) {
      const sl = staleLeads[0];
      opportunities.push({
        type: "lead_followup",
        label: `Follow up on ${sl.name}${sl.company ? ` (${sl.company})` : ""} — ${sl.daysSinceUpdate} days with no contact`,
        value: sl.budget ? `$${sl.budget}` : "Unknown",
        urgency: "medium",
      });
    }

    // Reactivation
    if (reactivationTargets.length > 0) {
      const rt = reactivationTargets[0];
      opportunities.push({
        type: "reactivation",
        label: `Reactivate ${rt.name} — $${rt.lifetimeValue.toFixed(0)} lifetime value, ${rt.daysSinceLastInvoice} days since last invoice`,
        value: `$${rt.lifetimeValue.toFixed(0)}`,
        urgency: rt.lifetimeValue >= 5000 ? "high" : "medium",
      });
    }

    // Upsell top client
    const highValueClient = clientRankings.find(c => c.valueTier === "high");
    if (highValueClient && !reactivationTargets.some(r => r.id === highValueClient.id)) {
      opportunities.push({
        type: "upsell",
        label: `Upsell opportunity: ${highValueClient.name} — $${highValueClient.lifetimeValue.toFixed(0)} LTV, consider expanding scope`,
        value: `$${highValueClient.lifetimeValue.toFixed(0)} LTV`,
        urgency: "low",
      });
    }

    res.json({ clientRankings, staleLeads, overdueCollections, reactivationTargets, opportunities });
  } catch (err) {
    req.log.error({ err }, "Failed to get revenue intelligence");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
