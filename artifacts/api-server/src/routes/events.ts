import { Router } from "express";
import { db } from "@workspace/db";
import { events } from "@workspace/db";
import { desc, lt } from "drizzle-orm";
import { subscribeToEvents } from "../events.js";

const router = Router();

router.get("/events/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  subscribeToEvents(res);

  const recent = await db.select().from(events).orderBy(desc(events.createdAt)).limit(30);
  for (const row of recent.reverse()) {
    const payload = {
      id: row.id,
      type: row.type,
      category: row.category,
      title: row.title,
      description: row.description,
      entityId: row.entityId,
      entityType: row.entityType,
      meta: row.meta,
      createdAt: row.createdAt.toISOString(),
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

router.get("/events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = await db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/events/old", async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db.delete(events).where(lt(events.createdAt, cutoff));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to prune events");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
