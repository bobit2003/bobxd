import { Router } from "express";
import { db } from "@workspace/db";
import { projects, tasks, clients, notes, conversations, leads, invoices, contentItems } from "@workspace/db";
import { ilike, or } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) {
      return res.json({ projects: [], tasks: [], clients: [], notes: [], conversations: [], leads: [], invoices: [], content: [] });
    }
    const pattern = `%${q}%`;

    const [pRows, tRows, cRows, nRows, convRows, lRows, iRows, ctRows] = await Promise.all([
      db.select().from(projects).where(or(ilike(projects.name, pattern), ilike(projects.description, pattern))).limit(10),
      db.select().from(tasks).where(or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))).limit(10),
      db.select().from(clients).where(or(ilike(clients.name, pattern), ilike(clients.company, pattern))).limit(10),
      db.select().from(notes).where(or(ilike(notes.title, pattern), ilike(notes.content, pattern))).limit(10),
      db.select().from(conversations).where(ilike(conversations.title, pattern)).limit(10),
      db.select().from(leads).where(or(ilike(leads.name, pattern), ilike(leads.company, pattern), ilike(leads.service, pattern))).limit(10),
      db.select().from(invoices).where(or(ilike(invoices.invoiceNumber, pattern), ilike(invoices.items, pattern))).limit(10),
      db.select().from(contentItems).where(or(ilike(contentItems.title, pattern), ilike(contentItems.content, pattern))).limit(10),
    ]);

    res.json({
      projects: pRows.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })),
      tasks: tRows.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(), dueDate: t.dueDate?.toISOString() ?? null })),
      clients: cRows.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
      notes: nRows.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })),
      conversations: convRows.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
      leads: lRows.map(l => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString(), lastContactedAt: l.lastContactedAt?.toISOString() ?? null })),
      invoices: iRows.map(i => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString(), dueDate: i.dueDate?.toISOString() ?? null, paidDate: i.paidDate?.toISOString() ?? null })),
      content: ctRows.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), scheduledDate: c.scheduledDate?.toISOString() ?? null, publishedDate: c.publishedDate?.toISOString() ?? null })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to search");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
