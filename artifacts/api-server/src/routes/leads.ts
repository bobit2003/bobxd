import { Router } from "express";
import { db } from "@workspace/db";
import { leads, clients, projects } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateLeadBody, UpdateLeadBody } from "@workspace/api-zod";
import { emitEvent } from "../events.js";

const router = Router();

function serialize(l: typeof leads.$inferSelect) {
  return {
    ...l,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

router.get("/leads", async (req, res) => {
  try {
    const rows = await db.select().from(leads).orderBy(desc(leads.createdAt));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const body = CreateLeadBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(leads).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
    emitEvent("lead_created", "LEAD", `New ${row.score} lead: ${row.name}`, {
      entityId: row.id, entityType: "lead", meta: { score: row.score, stage: row.stage, company: row.company }
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/leads/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateLeadBody.parse(req.body);
    const [row] = await db.update(leads).set({ ...body, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
    emitEvent("lead_updated", "LEAD", `Lead updated: ${row.name} — ${row.stage}`, {
      entityId: row.id, entityType: "lead", meta: { stage: row.stage, score: row.score }
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(leads).where(eq(leads.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
    emitEvent("lead_deleted", "LEAD", `Lead removed`, {
      entityId: id, entityType: "lead"
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to delete lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads/:id/convert", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    if (!lead) return res.status(404).json({ error: "Not found" });
    if (lead.stage === "won" || lead.stage === "lost") {
      return res.status(400).json({ error: "Lead already converted or lost" });
    }

    const now = new Date();
    const result = await db.transaction(async (tx) => {
      const [client] = await tx.insert(clients).values({
        name: lead.name,
        email: lead.email,
        company: lead.company,
        notes: lead.notes,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }).returning();

      const [project] = await tx.insert(projects).values({
        name: `${lead.company || lead.name} Project`,
        description: `Project for ${lead.name}. Service: ${lead.service || 'TBD'}. Budget: ${lead.budget || 'TBD'}`,
        status: "active",
        type: "website",
        clientId: client.id,
        createdAt: now,
        updatedAt: now,
      }).returning();

      await tx.update(leads).set({ stage: "won", updatedAt: now }).where(eq(leads.id, id));
      return { clientId: client.id, projectId: project.id };
    });

    res.json(result);
    emitEvent("lead_converted", "LEAD", `Lead converted to client: ${lead.name}`, {
      entityId: lead.id, entityType: "lead", meta: { ...result, leadName: lead.name }
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to convert lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
