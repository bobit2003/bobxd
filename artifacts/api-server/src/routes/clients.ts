import { Router } from "express";
import { db } from "@workspace/db";
import { clients } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody, UpdateClientParams, DeleteClientParams } from "@workspace/api-zod";

const router = Router();

function serialize(c: typeof clients.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
}

router.get("/clients", async (req, res) => {
  try {
    const rows = await db.select().from(clients).orderBy(clients.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list clients");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clients", async (req, res) => {
  try {
    const body = CreateClientBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(clients).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create client");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const { id } = UpdateClientParams.parse({ id: Number(req.params.id) });
    const body = UpdateClientBody.parse(req.body);
    const [row] = await db.update(clients).set({ ...body, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update client");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/clients/:id", async (req, res) => {
  try {
    const { id } = DeleteClientParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(clients).where(eq(clients.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
