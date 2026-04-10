import { Router } from "express";
import { db } from "@workspace/db";
import { timeEntries } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateTimeEntryBody } from "@workspace/api-zod";

const router = Router();

function serialize(t: typeof timeEntries.$inferSelect) {
  return { ...t, date: t.date.toISOString(), createdAt: t.createdAt.toISOString() };
}

router.get("/time-entries", async (req, res) => {
  try {
    const rows = await db.select().from(timeEntries).orderBy(desc(timeEntries.date));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list time entries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/time-entries", async (req, res) => {
  try {
    const body = CreateTimeEntryBody.parse(req.body);
    const [row] = await db.insert(timeEntries).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create time entry");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/time-entries/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete time entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
