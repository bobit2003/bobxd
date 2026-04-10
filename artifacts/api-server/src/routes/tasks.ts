import { Router } from "express";
import { db } from "@workspace/db";
import { tasks } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody, UpdateTaskParams, DeleteTaskParams } from "@workspace/api-zod";

const router = Router();

function serialize(t: typeof tasks.$inferSelect) {
  return {
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/tasks", async (req, res) => {
  try {
    const conditions = [];
    if (req.query.projectId) conditions.push(eq(tasks.projectId, Number(req.query.projectId)));
    if (req.query.clientId) conditions.push(eq(tasks.clientId, Number(req.query.clientId)));
    if (req.query.status) conditions.push(eq(tasks.status, String(req.query.status)));

    const rows = conditions.length
      ? await db.select().from(tasks).where(and(...conditions)).orderBy(tasks.createdAt)
      : await db.select().from(tasks).orderBy(tasks.createdAt);

    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const body = CreateTaskBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(tasks).values({ ...body, dueDate: body.dueDate ? new Date(body.dueDate) : null, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = UpdateTaskParams.parse({ id: Number(req.params.id) });
    const body = UpdateTaskBody.parse(req.body);
    const [row] = await db.update(tasks).set({
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      updatedAt: new Date(),
    }).where(eq(tasks.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
