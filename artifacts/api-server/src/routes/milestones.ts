import { Router } from "express";
import { db } from "@workspace/db";
import { milestones } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateMilestoneBody, UpdateMilestoneBody } from "@workspace/api-zod";

const router = Router();

function serialize(m: typeof milestones.$inferSelect) {
  return {
    ...m,
    dueDate: m.dueDate?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/milestones", async (req, res) => {
  try {
    const rows = await db.select().from(milestones).orderBy(desc(milestones.createdAt));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list milestones");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/milestones", async (req, res) => {
  try {
    const body = CreateMilestoneBody.parse(req.body);
    const [row] = await db.insert(milestones).values(body).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create milestone");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/milestones/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateMilestoneBody.parse(req.body);
    const updateData: Record<string, unknown> = { ...body };
    if (body.status === "completed") {
      updateData.completedAt = new Date();
    }
    const [row] = await db.update(milestones).set(updateData).where(eq(milestones.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update milestone");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/milestones/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(milestones).where(eq(milestones.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete milestone");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
