import { Router } from "express";
import { db } from "@workspace/db";
import { metrics } from "@workspace/db";
import { desc } from "drizzle-orm";
import { CreateMetricBody } from "@workspace/api-zod";

const router = Router();

function serialize(m: typeof metrics.$inferSelect) {
  return { ...m, date: m.date.toISOString(), createdAt: m.createdAt.toISOString() };
}

router.get("/metrics", async (req, res) => {
  try {
    const rows = await db.select().from(metrics).orderBy(desc(metrics.date)).limit(200);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list metrics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/metrics", async (req, res) => {
  try {
    const body = CreateMetricBody.parse(req.body);
    const [row] = await db.insert(metrics).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create metric");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
