import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, leads, invoices, milestones, clients, timeEntries, habits, automations, conversations, messages, projects, auditLog, directives, memories } from "@workspace/db";
import { eq, count, isNotNull, and, gte, desc, ne } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { writeAudit } from "../audit-writer.js";

const router = Router();

// Daily strategic plan — SSE stream
router.get("/intelligence/daily-plan", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

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

    const opportunities: { type: string; label: string; value: string | null; urgency: string }[] = [];

    const totalOverdue = overdueCollections.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    if (overdueCollections.length > 0) {
      opportunities.push({
        type: "collection",
        label: `Collect $${totalOverdue.toFixed(0)} overdue across ${overdueCollections.length} invoice${overdueCollections.length > 1 ? "s" : ""}`,
        value: `$${totalOverdue.toFixed(0)}`,
        urgency: "high",
      });
    }

    const hotStaleLead = staleLeads.find(l => l.score === "hot");
    if (hotStaleLead) {
      opportunities.push({
        type: "lead_followup",
        label: `Follow up on hot lead ${hotStaleLead.name}${hotStaleLead.company ? ` (${hotStaleLead.company})` : ""} — ${hotStaleLead.daysSinceUpdate} days idle${hotStaleLead.budget ? `, $${hotStaleLead.budget}` : ""}`,
        value: hotStaleLead.budget ? `$${hotStaleLead.budget}` : null,
        urgency: "high",
      });
    } else if (staleLeads.length > 0) {
      const sl = staleLeads[0];
      opportunities.push({
        type: "lead_followup",
        label: `Follow up on ${sl.name}${sl.company ? ` (${sl.company})` : ""} — ${sl.daysSinceUpdate} days with no contact`,
        value: sl.budget ? `$${sl.budget}` : null,
        urgency: "medium",
      });
    }

    if (reactivationTargets.length > 0) {
      const rt = reactivationTargets[0];
      opportunities.push({
        type: "reactivation",
        label: `Reactivate ${rt.name} — $${rt.lifetimeValue.toFixed(0)} lifetime value, ${rt.daysSinceLastInvoice} days since last invoice`,
        value: `$${rt.lifetimeValue.toFixed(0)}`,
        urgency: rt.lifetimeValue >= 5000 ? "high" : "medium",
      });
    }

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

// Proactive alerts endpoint
router.get("/intelligence/alerts", async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const alerts: { type: string; severity: string; message: string; link: string }[] = [];

    const allTasks = await db.select().from(tasks);
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) < today
    );
    if (overdueTasks.length > 0) {
      alerts.push({
        type: "overdue_tasks",
        severity: "high",
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? "s" : ""} overdue`,
        link: "/tasks",
      });
    }

    const allHabits = await db.select().from(habits);
    const unloggedHabits = allHabits.filter(
      (h) => !h.lastCompleted || new Date(h.lastCompleted) < today
    );
    if (unloggedHabits.length > 0) {
      alerts.push({
        type: "habits_unlogged",
        severity: "medium",
        message: `${unloggedHabits.length} habit${unloggedHabits.length > 1 ? "s" : ""} not logged today`,
        link: "/habits",
      });
    }

    const allInvoices = await db.select().from(invoices);
    const pastDueInvoices = allInvoices.filter(
      (i) => i.status !== "paid" && i.status !== "cancelled" && i.dueDate && new Date(i.dueDate) < today
    );
    if (pastDueInvoices.length > 0) {
      const totalPastDue = pastDueInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
      alerts.push({
        type: "invoices_overdue",
        severity: "high",
        message: `${pastDueInvoices.length} invoice${pastDueInvoices.length > 1 ? "s" : ""} past due — $${totalPastDue.toFixed(0)} outstanding`,
        link: "/invoices",
      });
    }

    const allLeads = await db.select().from(leads);
    const hotIdleLeads = allLeads.filter((l) => {
      if (l.score !== "hot" || l.stage === "won" || l.stage === "lost") return false;
      const lastUpdate = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24) >= 7;
    });
    if (hotIdleLeads.length > 0) {
      alerts.push({
        type: "hot_leads_idle",
        severity: "high",
        message: `${hotIdleLeads.length} hot lead${hotIdleLeads.length > 1 ? "s" : ""} idle 7+ days — follow up now`,
        link: "/leads",
      });
    }

    res.json(alerts);
  } catch (err) {
    req.log.error({ err }, "Failed to get intelligence alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Living Agent Map stats endpoint
router.get("/intelligence/agent-stats", async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [convCount] = await db.select({ count: count() }).from(conversations);
    const [msgCount] = await db.select({ count: count() }).from(messages);
    const [activeTaskCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "in_progress"));
    const [totalTaskCount] = await db.select({ count: count() }).from(tasks);
    const [pendingTaskCount] = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "todo"));
    const [projectCount] = await db.select({ count: count() }).from(projects);
    const [automationCount] = await db.select({ count: count() }).from(automations);
    const [activeAutomationCount] = await db.select({ count: count() }).from(automations).where(eq(automations.status, "active"));
    const [automationsRunCount] = await db.select({ count: count() }).from(automations).where(isNotNull(automations.lastRunAt));
    const [totalRunCount] = await db.select({ count: count() }).from(auditLog).where(eq(auditLog.action, "automation.run"));
    const [recentRunCount] = await db.select({ count: count() }).from(auditLog).where(
      and(eq(auditLog.action, "automation.run"), gte(auditLog.createdAt, sevenDaysAgo))
    );
    const [clientCount] = await db.select({ count: count() }).from(clients);
    const [activeClientCount] = await db.select({ count: count() }).from(clients).where(eq(clients.status, "active"));

    const allLeads = await db.select().from(leads);
    const hotLeads = allLeads.filter((l) => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");

    const allInvoices = await db.select().from(invoices);
    const pipelineValue = allInvoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const paidRevenue = allInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    res.json({
      aiBrain: {
        conversationCount: Number(convCount.count),
        messageCount: Number(msgCount.count),
      },
      operations: {
        activeTasks: Number(activeTaskCount.count),
        pendingTasks: Number(pendingTaskCount.count),
        totalTasks: Number(totalTaskCount.count),
        projectCount: Number(projectCount.count),
      },
      revenue: {
        pipelineValue: parseFloat(pipelineValue.toFixed(2)),
        paidRevenue: parseFloat(paidRevenue.toFixed(2)),
        hotLeads: hotLeads.length,
        totalLeads: allLeads.length,
        activeClients: Number(activeClientCount.count),
        totalClients: Number(clientCount.count),
      },
      automation: {
        totalAutomations: Number(automationCount.count),
        activeAutomations: Number(activeAutomationCount.count),
        automationsEverRun: Number(automationsRunCount.count),
        totalRunCount: Number(totalRunCount.count),
        recentRunCount: Number(recentRunCount.count),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get agent stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Directives ──────────────────────────────────────────────────────────────

router.get("/intelligence/directives", async (req, res) => {
  try {
    const rows = await db.select().from(directives)
      .where(ne(directives.status, "dismissed"))
      .orderBy(desc(directives.createdAt))
      .limit(20);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list directives");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/intelligence/directives/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body as { status: string };
    if (!["active", "dismissed", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db.update(directives)
      .set({ status, updatedAt: new Date() })
      .where(eq(directives.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update directive");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /intelligence/analyze — AI analyzes system context and generates directives
router.post("/intelligence/analyze", async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [allTasks, allLeads, allInvoices, allClients, allProjects, topMemories] = await Promise.all([
      db.select().from(tasks),
      db.select().from(leads),
      db.select().from(invoices),
      db.select().from(clients),
      db.select().from(projects),
      db.select().from(memories).orderBy(desc(memories.createdAt)).limit(5),
    ]);

    const pendingTasks = allTasks.filter(t => t.status !== "done");
    const highPri = pendingTasks.filter(t => t.priority === "high");
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
    const unpaidInvoices = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
    const overdueInv = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) < today);
    const totalUnpaid = unpaidInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "won" || l.stage === "lost") return false;
      const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
      return last < sevenDaysAgo;
    });
    const activeProjects = allProjects.filter(p => p.status === "active");

    const contextBlock = `SYSTEM STATE — ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

TASKS: ${pendingTasks.length} pending | ${highPri.length} high-priority | ${overdueTasks.length} overdue
REVENUE: $${totalRevenue.toFixed(0)} collected | $${totalUnpaid.toFixed(0)} unpaid | ${overdueInv.length} overdue invoices
LEADS: ${hotLeads.length} hot | ${staleLeads.length} stale (7+ days idle) | ${allLeads.filter(l => l.stage !== "won" && l.stage !== "lost").length} active
CLIENTS: ${allClients.filter(c => c.status === "active").length} active of ${allClients.length} total
PROJECTS: ${activeProjects.length} active of ${allProjects.length} total

KEY ITEMS:
- High-priority tasks: ${highPri.slice(0, 3).map(t => t.title).join("; ") || "none"}
- Overdue tasks: ${overdueTasks.slice(0, 3).map(t => t.title).join("; ") || "none"}
- Hot leads: ${hotLeads.slice(0, 3).map(l => `${l.name}${l.budget ? " $" + l.budget : ""}`).join("; ") || "none"}
- Stale leads: ${staleLeads.slice(0, 3).map(l => l.name).join("; ") || "none"}
- Overdue invoices: ${overdueInv.slice(0, 3).map(i => `${i.title || "Invoice"} $${i.amount}`).join("; ") || "none"}
${topMemories.length > 0 ? `\nMEMORIES: ${topMemories.slice(0, 3).map(m => m.content).join(" | ")}` : ""}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a multi-agent AI operating system. Analyze the system state and generate exactly 5 actionable directives. Each directive must:
- Be specific and actionable (not generic advice)
- Reference actual data from the context
- Be assigned to the most appropriate agent: CEO Agent, Revenue Agent, Ops Agent, Analytics Agent, or Communication Agent
- Have a priority: high, medium, or low
- Have a type: revenue, ops, analytics, communication, or system

Respond with ONLY a JSON array of 5 objects. Each object: { "content": string, "type": string, "priority": string, "source": string }

Example: [{"content": "Follow up with 3 hot leads worth $15,000 combined before end of week", "type": "revenue", "priority": "high", "source": "Revenue Agent"}]`
        },
        { role: "user", content: contextBlock }
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    let parsed: Array<{ content: string; type: string; priority: string; source: string }> = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    } catch { parsed = []; }

    if (parsed.length === 0) {
      return res.status(500).json({ error: "AI analysis returned no directives" });
    }

    // Dismiss old active directives, replace with new ones
    await db.update(directives).set({ status: "dismissed", updatedAt: new Date() }).where(eq(directives.status, "active"));

    const inserted = await db.insert(directives).values(
      parsed.slice(0, 5).map(d => ({
        content: d.content,
        type: d.type || "system",
        priority: d.priority || "medium",
        source: d.source || "System",
        status: "active",
      }))
    ).returning();

    writeAudit({ action: "intelligence.analyze", entity: "system", entityId: null, details: `AI generated ${inserted.length} directives`, source: "ai" });

    res.json(inserted.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to analyze system context");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
