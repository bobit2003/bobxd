import { Router } from "express";
import { db } from "@workspace/db";
import { projects, tasks, clients, notes, conversations } from "@workspace/db";
import { ilike, or } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) {
      return res.json({ projects: [], tasks: [], clients: [], notes: [], conversations: [] });
    }
    const pattern = `%${q}%`;

    const [pRows, tRows, cRows, nRows, convRows] = await Promise.all([
      db.select().from(projects).where(or(ilike(projects.name, pattern), ilike(projects.description, pattern))).limit(10),
      db.select().from(tasks).where(or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))).limit(10),
      db.select().from(clients).where(or(ilike(clients.name, pattern), ilike(clients.company, pattern))).limit(10),
      db.select().from(notes).where(or(ilike(notes.title, pattern), ilike(notes.content, pattern))).limit(10),
      db.select().from(conversations).where(ilike(conversations.title, pattern)).limit(10),
    ]);

    res.json({
      projects: pRows.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
      tasks: tRows.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(), dueDate: t.dueDate?.toISOString() ?? null })),
      clients: cRows.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
      notes: nRows.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })),
      conversations: convRows.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to search");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
