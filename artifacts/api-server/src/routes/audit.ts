import { Router } from "express";
import { db } from "@workspace/db";
import { auditLog } from "@workspace/db";
import { desc, gt } from "drizzle-orm";

const router = Router();

function serializeAudit(a: typeof auditLog.$inferSelect) {
  return {
    id: a.id,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    details: a.details,
    source: a.source,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/audit", async (req, res) => {
  try {
    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);
    res.json(rows.map(serializeAudit));
  } catch (err) {
    req.log.error({ err }, "Failed to list audit log");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/audit/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const initial = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(20);

    let lastId = 0;
    for (const entry of initial.slice().reverse()) {
      if (entry.id > lastId) lastId = entry.id;
      res.write(`data: ${JSON.stringify(serializeAudit(entry))}\n\n`);
    }

    const interval = setInterval(async () => {
      try {
        const newEntries = await db
          .select()
          .from(auditLog)
          .where(gt(auditLog.id, lastId))
          .orderBy(auditLog.id)
          .limit(50);

        for (const entry of newEntries) {
          if (entry.id > lastId) lastId = entry.id;
          res.write(`data: ${JSON.stringify(serializeAudit(entry))}\n\n`);
        }
      } catch {}
    }, 3000);

    req.on("close", () => clearInterval(interval));
  } catch (err) {
    req.log.error({ err }, "Audit stream error");
    res.end();
  }
});

router.post("/audit", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(auditLog).values({
      action: body.action || "unknown",
      entity: body.entity ?? "unknown",
      entityId: body.entityId ?? null,
      details: body.details ?? null,
      source: body.source ?? "user",
    }).returning();
    res.status(201).json(serializeAudit(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create audit log");
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
