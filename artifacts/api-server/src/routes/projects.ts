import { Router } from "express";
import { db } from "@workspace/db";
import { projects } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProjectBody, UpdateProjectBody, GetProjectParams, UpdateProjectParams, DeleteProjectParams } from "@workspace/api-zod";
import { emitEvent } from "../events.js";
import { writeAudit } from "../audit-writer.js";

const router = Router();

function serialize(p: typeof projects.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

router.get("/projects", async (req, res) => {
  try {
    const rows = await db.select().from(projects).orderBy(projects.createdAt);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const body = CreateProjectBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(projects).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
    emitEvent("project_created", "PROJECT", `Project created: ${row.name}`, {
      entityId: row.id, entityType: "project",
      meta: { status: row.status, clientId: row.clientId },
    }).catch(() => {});
    writeAudit("project.create", "project", {
      entityId: row.id,
      details: `Created project "${row.name}" [${row.status}]`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(400).json({ error: "Bad request" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const { id } = GetProjectParams.parse({ id: Number(req.params.id) });
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/projects/:id", async (req, res) => {
  try {
    const { id } = UpdateProjectParams.parse({ id: Number(req.params.id) });
    const body = UpdateProjectBody.parse(req.body);
    const [row] = await db.update(projects).set({ ...body, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
    const isActive = row.status === "active";
    emitEvent(isActive ? "project_activated" : "project_updated", "PROJECT",
      isActive ? `Project activated: ${row.name}` : `Project updated: ${row.name}`,
      { entityId: row.id, entityType: "project", meta: { status: row.status } }
    ).catch(() => {});
    writeAudit("project.update", "project", {
      entityId: row.id,
      details: `Updated project "${row.name}" — status: ${row.status}`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = DeleteProjectParams.parse({ id: Number(req.params.id) });
    const deleted = await db.delete(projects).where(eq(projects.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
    emitEvent("project_deleted", "PROJECT", `Project removed`, {
      entityId: id, entityType: "project"
    }).catch(() => {});
    writeAudit("project.delete", "project", { entityId: id, details: "Project deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
