import { Router } from "express";
import { db } from "@workspace/db";
import { memories } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateMemoryBody } from "@workspace/api-zod";

const router = Router();

function serialize(m: typeof memories.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

router.get("/memories", async (req, res) => {
  try {
    const rows = await db.select().from(memories).orderBy(desc(memories.createdAt)).limit(100);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list memories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/memories", async (req, res) => {
  try {
    const body = CreateMemoryBody.parse(req.body);
    const [row] = await db.insert(memories).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create memory");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/memories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(memories).where(eq(memories.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
