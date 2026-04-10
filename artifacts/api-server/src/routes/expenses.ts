import { Router } from "express";
import { db } from "@workspace/db";
import { expenses } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateExpenseBody } from "@workspace/api-zod";

const router = Router();

function serialize(e: typeof expenses.$inferSelect) {
  return { ...e, date: e.date.toISOString(), createdAt: e.createdAt.toISOString() };
}

router.get("/expenses", async (req, res) => {
  try {
    const rows = await db.select().from(expenses).orderBy(desc(expenses.date));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list expenses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const body = CreateExpenseBody.parse(req.body);
    const [row] = await db.insert(expenses).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create expense");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
