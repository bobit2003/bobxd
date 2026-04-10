import { Router } from "express";
import { db } from "@workspace/db";
import { auditLog } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

function serialize(a: typeof auditLog.$inferSelect) {
  return { ...a, createdAt: a.createdAt.toISOString() };
}

router.get("/audit", async (req, res) => {
  try {
    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list audit log");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
