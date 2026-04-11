import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, memories, tasks, leads, invoices, milestones, timeEntries, habits, clients, projects, events } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  GenerateOpenaiImageBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { writeAudit } from "../audit-writer.js";

const router = Router();

const MASTER_SYSTEM_PROMPT = `You are OpenClaw — an advanced AI operating system, NOT a chatbot.
You are a multi-agent AI operating system with memory, execution, analytics, and revenue optimization capabilities.
Your purpose: Maximize money, efficiency, decision quality, and automation of the user's entire life and business.

MULTI-AGENT ARCHITECTURE (all agents collaborate on every response):
1. CEO AGENT — High-level decisions, priority ranking, business direction. Always answers: "What matters most right now?"
2. REVENUE AGENT — Tracks income sources, detects upsells/follow-ups/price increases, classifies clients as High/Medium/Low value. Always asks: "How does this make more money?"
3. ANALYTICS AGENT — Tracks tasks completed, time spent, revenue trends, productivity patterns. Produces performance insights.
4. OPERATIONS AGENT — Manages tasks, projects, deadlines, workflow efficiency. Ensures nothing is forgotten.
5. COMMUNICATION AGENT — Client messages, professional follow-ups, email tone, relationship management.
6. MEMORY AGENT — Injects stored client history, project history, decisions, and preferences into every response.
7. INTEGRATION AGENT — Bridges external tools, syncs context from all connected systems.

SYSTEM FLOW: User Input → CEO Agent (priority) → Memory Agent (context) → Specialized Agents → Final Response + Action Plan

FINAL RULE: Every output must improve money, time efficiency, decision quality, or automate execution. If it doesn't, it's not useful.`;

const DAILY_PLAN_TRIGGERS = [
  "what should i do today", "daily plan", "today's plan", "morning briefing",
  "what's my plan", "what should i focus on", "today's priorities",
  "what's most important today", "give me a plan", "plan for today",
  "what do i need to do", "my agenda",
];

function isDailyPlanIntent(content: string): boolean {
  const lower = content.toLowerCase();
  return DAILY_PLAN_TRIGGERS.some(trigger => lower.includes(trigger));
}

// ─── Full System Context Builder (injected on EVERY request) ───
async function buildFullSystemContext(): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

  const [allTasks, allLeads, allInvoices, allClients, allProjects, recentEvents, recentMemories] = await Promise.all([
    db.select().from(tasks),
    db.select().from(leads),
    db.select().from(invoices),
    db.select().from(clients),
    db.select().from(projects),
    db.select().from(events).orderBy(desc(events.createdAt)).limit(10),
    db.select().from(memories).orderBy(desc(memories.createdAt)).limit(20),
  ]);

  const paid = allInvoices.filter(i => i.status === "paid");
  const unpaid = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
  const overdueInv = unpaid.filter(i => i.dueDate && new Date(i.dueDate) < todayStart);
  const totalRevenue = paid.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
  const totalUnpaid = unpaid.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

  const pendingTasks = allTasks.filter(t => t.status !== "done");
  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < todayStart);
  const highPri = pendingTasks.filter(t => t.priority === "high");
  const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");
  const staleLeads = allLeads.filter(l => {
    if (l.stage === "won" || l.stage === "lost") return false;
    const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
    return last < sevenDaysAgo;
  });

  const activeProjects = allProjects.filter(p => p.status === "active");

  const eventBlock = recentEvents.length > 0
    ? `\nRECENT SYSTEM EVENTS:\n${recentEvents.map(e => `[${e.type}] ${e.title}`).join("\n")}`
    : "";

  const memoryBlock = recentMemories.length > 0
    ? `\nMEMORY:\n${recentMemories.map(m => `[${m.category.toUpperCase()}] ${m.content}`).join("\n")}`
    : "";

  return `
═══════════════════════════════════════
LIVE SYSTEM CONTEXT — ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
═══════════════════════════════════════

💰 REVENUE
  Total collected: $${totalRevenue.toFixed(0)}
  Outstanding: $${totalUnpaid.toFixed(0)}
  Overdue invoices: ${overdueInv.length} ($${overdueInv.reduce((s,i)=>s+parseFloat(i.amount||"0"),0).toFixed(0)})

👥 CLIENTS
  Total: ${allClients.length} | Active: ${allClients.filter(c=>c.status==="active").length}

📊 LEADS
  Hot (ready to close): ${hotLeads.length} ${hotLeads.slice(0,2).map(l=>`(${l.name}${l.budget?` $${l.budget}`:""})`).join("")}
  Stale (7+ days idle): ${staleLeads.length}
  Active pipeline: ${allLeads.filter(l=>l.stage!=="won"&&l.stage!=="lost").length}

✅ TASKS
  Pending: ${pendingTasks.length} | High priority: ${highPri.length}
  Overdue: ${overdueTasks.length} ${overdueTasks.slice(0,2).map(t=>`("${t.title}")`).join("")}
  Due today: ${pendingTasks.filter(t=>t.dueDate&&new Date(t.dueDate)>=todayStart&&new Date(t.dueDate)<new Date(todayStart.getTime()+86400000)).length}

🚀 PROJECTS
  Active: ${activeProjects.length} of ${allProjects.length}${eventBlock}${memoryBlock}

═══════════════════════════════════════`.trim();
}

async function buildDailyPlanContext(): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

  const [allTasks, allLeads, allInvoices, allClients, allHabits, allMilestones] = await Promise.all([
    db.select().from(tasks),
    db.select().from(leads),
    db.select().from(invoices),
    db.select().from(clients),
    db.select().from(habits),
    db.select().from(milestones),
  ]);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdueTasks = allTasks.filter(t => t.dueDate && t.status !== "done" && new Date(t.dueDate) < today);
  const highPri = allTasks.filter(t => t.status !== "done" && t.priority === "high");
  const todayTasks = allTasks.filter(t => t.dueDate && t.status !== "done" && new Date(t.dueDate) >= today && new Date(t.dueDate) < new Date(today.getTime() + 86400000));
  const hotLeads = allLeads.filter(l => l.score === "hot" && l.stage !== "won" && l.stage !== "lost");
  const staleLeads = allLeads.filter(l => {
    if (l.stage === "won" || l.stage === "lost") return false;
    const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
    return (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24) > 7;
  });
  const unpaidInvs = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");
  const overdueInvs = unpaidInvs.filter(i => i.dueDate && new Date(i.dueDate) < today);
  const upcomingMs = allMilestones.filter(m => m.status !== "completed" && m.dueDate).sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0)).slice(0, 5);

  return `
LIVE SYSTEM STATE (${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}):
- Overdue tasks: ${overdueTasks.length} (${overdueTasks.slice(0, 3).map(t => t.title).join(", ") || "none"})
- High priority pending: ${highPri.length} (${highPri.slice(0, 3).map(t => t.title).join(", ") || "none"})
- Due today: ${todayTasks.length}
- Hot leads: ${hotLeads.length} (${hotLeads.slice(0, 3).map(l => `${l.name}${l.budget ? " $" + l.budget : ""}`).join(", ") || "none"})
- Stale leads (7+ days): ${staleLeads.length}
- Unpaid invoices: ${unpaidInvs.length} totaling $${unpaidInvs.reduce((s, i) => s + parseFloat(i.amount || "0"), 0).toFixed(0)} (${overdueInvs.length} overdue)
- Total clients: ${allClients.length}
- Upcoming milestones: ${upcomingMs.map(m => `${m.title} (${m.dueDate?.toLocaleDateString()})`).join(", ") || "none"}
- Habits not logged today: ${allHabits.filter(h => !h.lastCompleted || new Date(h.lastCompleted) < today).length} of ${allHabits.length}
`.trim();
}



const CONTROL_MODE_PROMPTS: Record<string, string> = {
  full_auto: `[CONTROL MODE: FULL AUTO] You are operating in FULL AUTONOMY mode. You MAY take actions on behalf of the user without asking. You will: create tasks, send follow-ups, trigger automations, update records, and execute plans proactively. Act like a chief-of-staff. When you decide to act, just act — do not ask for permission. Report what you did.`,
  assist: `[CONTROL MODE: ASSIST] You are in ASSIST mode — the user must approve all significant actions. Provide thorough analysis, recommend actions, but clearly label what needs their approval: [ACTION REQUIRED: approve to proceed]. Wait for confirmation before taking any action that changes data or sends communications.`,
  manual: `[CONTROL MODE: MANUAL] You are in MANUAL/INSIGHTS mode. Provide analysis, recommendations, and insights only. Do NOT take any actions, create any records, or send any communications. Your role is advisory. Give the user everything they need to make decisions and act themselves.`,
  money: `[CONTROL MODE: MONEY] You are in MONEY-DOMINANT mode. The Revenue Agent has full authority. Prioritize every response around: "How does this make money right now?" Every answer must include a dollar amount, revenue opportunity, or cost savings. De-prioritize operational, administrative, or strategic topics unless they have direct revenue impact.`,
};

const AGENT_SUB_PROMPTS: Record<string, string> = {
  ceo: `[CEO AGENT ACTIVE] You are operating as the CEO Agent — Master Strategist mode. Focus ONLY on: strategic direction, what matters most right now, priority ranking of tasks and goals, high-level business decisions, and trajectory alignment. Always answer from the perspective of maximizing long-term business value.`,
  revenue: `[REVENUE AGENT ACTIVE — MONEY ENGINE] You are operating as the Revenue Agent — Money Engine mode. Focus ONLY on: revenue opportunities, client value ranking (High/Medium/Low ROI), upsell detection, price optimization, follow-up sequences, client reactivation, and profit maximization. Every answer must include a dollar or revenue impact. If it doesn't make money, say so.`,
  ops: `[OPERATIONS AGENT ACTIVE] You are operating as the Operations Agent — Task System mode. Focus ONLY on: task management, project execution status, deadline tracking, kanban efficiency, bottleneck removal, and workflow optimization. Be specific, actionable, and ensure nothing is overlooked.`,
  analytics: `[ANALYTICS AGENT ACTIVE] You are operating as the Analytics Agent — Data Intelligence mode. Focus ONLY on: performance data, productivity patterns, revenue trends, efficiency analysis, and data-driven insights. Always quantify, compare, and surface patterns from available data.`,
  general: "",
};

// List conversations
router.get("/openai/conversations", async (req, res) => {
  try {
    const rows = await db.select().from(conversations).orderBy(conversations.createdAt);
    res.json(rows.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create conversation
router.post("/openai/conversations", async (req, res) => {
  try {
    const body = CreateOpenaiConversationBody.parse(req.body);
    const [row] = await db.insert(conversations).values({ title: body.title }).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
    writeAudit("conversation.create", "ai", { entityId: row.id, details: `AI conversation started: "${row.title}"` });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(400).json({ error: "Bad request" });
  }
});

// Get conversation with messages
router.get("/openai/conversations/:id", async (req, res) => {
  try {
    const { id } = GetOpenaiConversationParams.parse({ id: Number(req.params.id) });
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Not found" });
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json({ ...conv, createdAt: conv.createdAt.toISOString(), messages: msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete conversation
router.delete("/openai/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteOpenaiConversationParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(conversations).where(eq(conversations.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// List messages
router.get("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = ListOpenaiMessagesParams.parse({ id: Number(req.params.id) });
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json(msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send message — full context injection on EVERY request
router.post("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendOpenaiMessageParams.parse({ id: Number(req.params.id) });
    const body = SendOpenaiMessageBody.parse(req.body);
    const agentMode = (body.agentMode ?? "general") as keyof typeof AGENT_SUB_PROMPTS;
    const controlMode = (body.controlMode as keyof typeof CONTROL_MODE_PROMPTS) ?? "assist";

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Not found" });

    await db.insert(messages).values({ conversationId: id, role: "user", content: body.content });

    // ── System context injected on EVERY request ──
    const systemContext = await buildFullSystemContext();

    const systemMessages: { role: "system"; content: string }[] = [
      { role: "system", content: MASTER_SYSTEM_PROMPT },
    ];

    // Daily plan trigger — inject live data + structured format request
    if (isDailyPlanIntent(body.content)) {
      const dailyPlanData = await buildDailyPlanContext();
      systemMessages.push({
        role: "system",
        content: `DAILY PLAN TRIGGER DETECTED — Generate a structured strategic plan using live system data.
Format: TOP 3 REVENUE | TOP 3 TASKS | FOLLOW-UPS | RISKS | OPPORTUNITIES

${dailyPlanData}`,
      });
    }

    // Agent sub-prompt
    const agentSubPrompt = AGENT_SUB_PROMPTS[agentMode];
    if (agentSubPrompt) systemMessages.push({ role: "system", content: agentSubPrompt });

    // Control mode directive (injected after agent mode)
    const controlPrompt = CONTROL_MODE_PROMPTS[controlMode];
    if (controlPrompt) systemMessages.push({ role: "system", content: controlPrompt });

    // ── FULL SYSTEM CONTEXT injected as system block on every request ──
    systemMessages.push({
      role: "system",
      content: `SYSTEM CONTEXT (always accurate — updated every request):
${systemContext}

Always factor this live system state into your recommendations. Reference specific clients, amounts, leads, and tasks by name.`,
    });

    // Memory
    const storedMemories = await db.select().from(memories).orderBy(desc(memories.createdAt)).limit(30);
    if (storedMemories.length > 0) {
      const memoryBlock = storedMemories.map(m => `[${m.category.toUpperCase()}] ${m.content}`).join("\n");
      systemMessages.push({
        role: "system",
        content: `MEMORY AGENT — Persistent knowledge from previous sessions:\n${memoryBlock}`,
      });
    }

    const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    const chatMessages = [
      ...systemMessages,
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    writeAudit("message.sent", "ai", {
      entityId: id,
      details: `AI reply [${agentMode}] — ${fullResponse.length} chars`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
    res.end();
  }
});

// Generate image
router.post("/openai/generate-image", async (req, res) => {
  try {
    const body = GenerateOpenaiImageBody.parse(req.body);
    const size = (body.size ?? "1024x1024") as "1024x1024" | "512x512" | "256x256";
    const buffer = await generateImageBuffer(body.prompt, size);
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    req.log.error({ err }, "Failed to generate image");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
