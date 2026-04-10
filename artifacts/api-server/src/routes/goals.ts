import { Router } from "express";
import { db } from "@workspace/db";
import { goals } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateGoalBody, UpdateGoalBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function serialize(g: typeof goals.$inferSelect) {
  return {
    ...g,
    targetDate: g.targetDate?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

router.get("/goals", async (req, res) => {
  try {
    const rows = await db.select().from(goals).orderBy(goals.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list goals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals", async (req, res) => {
  try {
    const body = CreateGoalBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(goals).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create goal");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/goals/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateGoalBody.parse(req.body);
    const [row] = await db.update(goals).set({ ...body, updatedAt: new Date() }).where(eq(goals.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update goal");
    res.status(400).json({ error: "Bad request" });
  }
});

router.post("/goals/:id/strategy", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    if (!goal) return res.status(404).json({ error: "Not found" });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 600,
      messages: [
        {
          role: "system",
          content: `You are a world-class executive coach and strategic advisor. 
Analyze the goal and return a JSON object with:
- steps: array of exactly 5 concise, actionable steps (each under 80 chars)
- habit: one daily habit that directly accelerates this goal (under 60 chars)
- insight: one sharp strategic insight about this goal (under 120 chars)
Return ONLY valid JSON, no markdown, no explanation.`
        },
        {
          role: "user",
          content: `Goal: "${goal.title}"\nCategory: ${goal.category}\nDescription: ${goal.description ?? "none"}\nCurrent progress: ${goal.progress}%\n\nGenerate coaching strategy.`
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { steps: string[]; habit: string; insight: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { steps: ["Define clear milestones", "Track weekly progress", "Review blockers", "Adjust tactics", "Celebrate wins"], habit: "Review goal progress for 5 minutes daily", insight: "Consistency compounds — small daily actions create exponential results." };
    }

    const strategyStr = JSON.stringify(parsed);
    const [updated] = await db.update(goals).set({ strategy: strategyStr, updatedAt: new Date() }).where(eq(goals.id, id)).returning();
    res.json({ ...serialize(updated), strategyParsed: parsed });
  } catch (err) {
    req.log.error({ err }, "Failed to generate goal strategy");
    res.status(500).json({ error: "Strategy generation failed" });
  }
});

router.delete("/goals/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(goals).where(eq(goals.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete goal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
