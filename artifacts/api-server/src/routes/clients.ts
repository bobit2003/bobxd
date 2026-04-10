import { Router } from "express";
import { db } from "@workspace/db";
import { clients, invoices } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateClientBody, UpdateClientBody, UpdateClientParams, DeleteClientParams } from "@workspace/api-zod";
import { emitEvent } from "../events.js";

const router = Router();

function computeRevenue(clientId: number, allInvoices: (typeof invoices.$inferSelect)[]) {
  const paid = allInvoices.filter(i => i.clientId === clientId && i.status === "paid");
  const lifetimeValue = paid.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
  let valueTier: "high" | "medium" | "low";
  if (lifetimeValue >= 5000) valueTier = "high";
  else if (lifetimeValue >= 1000) valueTier = "medium";
  else valueTier = "low";

  const lastInvoice = paid.reduce((latest, inv) => {
    const d = inv.paidDate ? new Date(inv.paidDate) : new Date(inv.updatedAt);
    return d > latest ? d : latest;
  }, new Date(0));

  return {
    lifetimeValue,
    valueTier,
    paidInvoiceCount: paid.length,
    lastInvoiceDate: paid.length > 0 ? lastInvoice.toISOString() : null,
  };
}

function serialize(c: typeof clients.$inferSelect, revenueFields: ReturnType<typeof computeRevenue>) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ...revenueFields,
  };
}

router.get("/clients", async (req, res) => {
  try {
    const [rows, allInvoices] = await Promise.all([
      db.select().from(clients).orderBy(clients.createdAt),
      db.select().from(invoices),
    ]);
    res.json(rows.map(c => serialize(c, computeRevenue(c.id, allInvoices))));
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
    res.status(201).json(serialize(row, computeRevenue(row.id, [])));
    emitEvent("client_created", "CLIENT", `Client created: ${row.name}`, {
      entityId: row.id, entityType: "client", meta: { company: row.company, status: row.status }
    }).catch(() => {});
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
    const allInvoices = await db.select().from(invoices).where(eq(invoices.clientId, id));
    res.json(serialize(row, computeRevenue(row.id, allInvoices)));
    emitEvent("client_updated", "CLIENT", `Client updated: ${row.name}`, {
      entityId: row.id, entityType: "client"
    }).catch(() => {});
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
    emitEvent("client_deleted", "CLIENT", `Client removed`, {
      entityId: id, entityType: "client"
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to delete client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
