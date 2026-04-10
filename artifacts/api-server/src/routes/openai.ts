import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, memories } from "@workspace/db";
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

const AGENT_SUB_PROMPTS: Record<string, string> = {
  ceo: `[CEO AGENT ACTIVE]
You are operating as the CEO Agent — Master Strategist mode.
Focus ONLY on: strategic direction, what matters most right now, priority ranking of tasks and goals, high-level business decisions, and trajectory alignment.
Always answer from the perspective of maximizing long-term business value.`,

  revenue: `[REVENUE AGENT ACTIVE — MONEY ENGINE]
You are operating as the Revenue Agent — Money Engine mode.
Focus ONLY on: revenue opportunities, client value ranking (High/Medium/Low ROI), upsell detection, price optimization, follow-up sequences, client reactivation, and profit maximization.
Every answer must include a dollar or revenue impact. If it doesn't make money, say so.`,

  ops: `[OPERATIONS AGENT ACTIVE]
You are operating as the Operations Agent — Task System mode.
Focus ONLY on: task management, project execution status, deadline tracking, kanban efficiency, bottleneck removal, and workflow optimization.
Be specific, actionable, and ensure nothing is overlooked.`,

  analytics: `[ANALYTICS AGENT ACTIVE]
You are operating as the Analytics Agent — Data Intelligence mode.
Focus ONLY on: performance data, productivity patterns, revenue trends, efficiency analysis, and data-driven insights.
Always quantify, compare, and surface patterns from available data.`,

  general: "",
};

// List conversations
router.get("/openai/conversations", async (req, res) => {
  try {
    const rows = await db.select().from(conversations).orderBy(conversations.createdAt);
    res.json(rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
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
    res.json({
      ...conv,
      createdAt: conv.createdAt.toISOString(),
      messages: msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
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
    res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send message (streaming) — with master system prompt + memory injection + agent routing
router.post("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendOpenaiMessageParams.parse({ id: Number(req.params.id) });
    const body = SendOpenaiMessageBody.parse(req.body);
    const agentMode = (body.agentMode ?? "general") as keyof typeof AGENT_SUB_PROMPTS;

    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return res.status(404).json({ error: "Not found" });

    // Save user message
    await db.insert(messages).values({ conversationId: id, role: "user", content: body.content });

    // Fetch stored memories for context injection
    const storedMemories = await db.select().from(memories).orderBy(desc(memories.createdAt)).limit(50);

    // Build system messages
    const systemMessages: { role: "system"; content: string }[] = [
      { role: "system", content: MASTER_SYSTEM_PROMPT },
    ];

    // Inject memories if they exist
    if (storedMemories.length > 0) {
      const memoryBlock = storedMemories
        .map((m) => `[${m.category.toUpperCase()} | ${m.importance.toUpperCase()}] ${m.content}`)
        .join("\n");
      systemMessages.push({
        role: "system",
        content: `MEMORY AGENT CONTEXT — Persistent knowledge from previous sessions:\n${memoryBlock}`,
      });
    }

    // Inject agent-specific sub-prompt if not general
    const agentSubPrompt = AGENT_SUB_PROMPTS[agentMode];
    if (agentSubPrompt) {
      systemMessages.push({ role: "system", content: agentSubPrompt });
    }

    // Get conversation history
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const chatMessages = [
      ...systemMessages,
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
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
