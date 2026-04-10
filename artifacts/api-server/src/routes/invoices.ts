import { Router } from "express";
import { db } from "@workspace/db";
import { invoices } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateInvoiceBody, UpdateInvoiceBody } from "@workspace/api-zod";
import { emitEvent } from "../events.js";

const router = Router();

function serialize(i: typeof invoices.$inferSelect) {
  return {
    ...i,
    dueDate: i.dueDate?.toISOString() ?? null,
    paidDate: i.paidDate?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

router.get("/invoices", async (req, res) => {
  try {
    const rows = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list invoices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const body = CreateInvoiceBody.parse(req.body);
    const now = new Date();
    const [row] = await db.insert(invoices).values({ ...body, createdAt: now, updatedAt: now }).returning();
    res.status(201).json(serialize(row));
    emitEvent("invoice_created", "FIN", `Invoice created: ${row.invoiceNumber} — $${row.amount}`, {
      entityId: row.id, entityType: "invoice", meta: { amount: row.amount, status: row.status }
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to create invoice");
    res.status(400).json({ error: "Bad request" });
  }
});

router.put("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = UpdateInvoiceBody.parse(req.body);
    const [row] = await db.update(invoices).set({ ...body, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(serialize(row));
    const isPaid = row.status === "paid";
    emitEvent(
      isPaid ? "invoice_paid" : "invoice_updated",
      "FIN",
      isPaid ? `Payment received: ${row.invoiceNumber} — $${row.amount}` : `Invoice updated: ${row.invoiceNumber}`,
      { entityId: row.id, entityType: "invoice", meta: { amount: row.amount, status: row.status } }
    ).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to update invoice");
    res.status(400).json({ error: "Bad request" });
  }
});

router.delete("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    if (!deleted.length) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
    emitEvent("invoice_deleted", "FIN", `Invoice removed`, {
      entityId: id, entityType: "invoice"
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to delete invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
