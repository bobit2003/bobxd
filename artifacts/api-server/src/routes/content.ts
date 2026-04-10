import { Router } from "express";
import { db } from "@workspace/db";
import { contentItems } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateContentBody, UpdateContentBody } from "@workspace/api-zod";

const router = Router();

function serialize(c: typeof contentItems.$inferSelect) {
  return {
    ...c,
    scheduledDate: c.scheduledDate?.toISOString() ?? null,
    publishedDate: c.publishedDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/content", async (req, res) => {
  try {
    const rows = await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list content");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/content", async (req, res) => {
  try {
    const body = CreateContentBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(contentItems).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create content");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/content/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateContentBody.parse(req.body);
    const [row] = await db.update(contentItems).set({ ...body, updatedAt: new Date() }).where(eq(contentItems.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update content");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/content/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(contentItems).where(eq(contentItems.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete content");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
