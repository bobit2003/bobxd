import { Router } from "express";
import { db } from "@workspace/db";
import { notes } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateNoteBody, UpdateNoteBody } from "@workspace/api-zod";

const router = Router();

function serialize(n: typeof notes.$inferSelect) {
  return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
}

router.get("/notes", async (req, res) => {
  try {
    const rows = await db.select().from(notes).orderBy(notes.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const body = CreateNoteBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(notes).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to create note");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/notes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateNoteBody.parse(req.body);
    const [row] = await db.update(notes).set({ ...body, updatedAt: new Date() }).where(eq(notes.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to update note");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(notes).where(eq(notes.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
