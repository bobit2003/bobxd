import { Router } from "express";
import { db } from "@workspace/db";
import { goals } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateGoalBody, UpdateGoalBody } from "@workspace/api-zod";

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
