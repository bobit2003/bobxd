import { Router } from "express";
import { db } from "@workspace/db";
import { tasks, leads, invoices, clients, events } from "@workspace/db";
import { emitEvent } from "../events.js";
import { writeAudit } from "../audit-writer.js";

const router = Router();

// ──────────────────────────────────────────────
// Rule 1: Stale leads → follow-up task + alert
// ──────────────────────────────────────────────
async function checkStaleLeads() {
  const [allLeads, allTasks] = await Promise.all([
    db.select().from(leads),
    db.select().from(tasks),
  ]);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const stale = allLeads.filter(l => {
    if (l.stage === "won" || l.stage === "lost") return false;
    const last = l.updatedAt ? new Date(l.updatedAt) : new Date(l.createdAt);
    return last < sevenDaysAgo;
  });

  for (const lead of stale) {
    const hasTask = allTasks.some(t =>
      t.leadId === lead.id &&
      t.status !== "done" &&
      (t.title as string).toLowerCase().includes("follow")
    );

    if (!hasTask) {
      const [task] = await db.insert(tasks).values({
        title: `Follow up with stale lead: ${lead.name}`,
        description: `Lead "${lead.name}" (${lead.email || "no email"}) has been idle for 7+ days. Last stage: ${lead.stage}. Score: ${lead.score}. Reach out with value proposition.`,
        status: "pending",
        priority: lead.score === "hot" ? "high" : "medium",
        
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      await emitEvent("lead_stale_detected", "LEAD",
        `Stale lead: ${lead.name} — follow-up task created`,
        { entityId: lead.id, entityType: "lead", meta: { leadName: lead.name, score: lead.score } }
      );

      writeAudit("automation.stale_lead", "lead", {
        entityId: lead.id,
        details: `Stale lead "${lead.name}" — auto follow-up task #${task.id} created`,
      });
    }
  }

  return stale.length;
}

// ──────────────────────────────────────────────
// Rule 2: Overdue invoices → reminder task + alert
// ──────────────────────────────────────────────
async function checkOverdueInvoices() {
  const [allInvoices, allTasks, allClients] = await Promise.all([
    db.select().from(invoices),
    db.select().from(tasks),
    db.select().from(clients),
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = allInvoices.filter(i =>
    i.status !== "paid" &&
    i.status !== "cancelled" &&
    i.dueDate &&
    new Date(i.dueDate) < today
  );

  for (const invoice of overdue) {
    const hasReminder = allTasks.some(t =>
      (t as any).invoiceId === invoice.id &&
      t.status !== "done" &&
      (t.title as string).toLowerCase().includes("payment")
    );

    if (!hasReminder) {
      const client = invoice.clientId
        ? allClients.find(c => (c as any).id === invoice.clientId)
        : null;

      const [task] = await db.insert(tasks).values({
        title: `Overdue invoice #${invoice.invoiceNumber || invoice.id} — follow up on $${invoice.amount}`,
        description: `Invoice for $${invoice.amount} was due ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}. Client: ${client?.name || "Unknown"}. Send payment reminder immediately.`,
        status: "pending",
        priority: "high",
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      await emitEvent("invoice_overdue", "FIN",
        `Overdue invoice: #${invoice.invoiceNumber || invoice.id} — $${invoice.amount}`,
        { entityId: invoice.id, entityType: "invoice", meta: { amount: invoice.amount, clientName: client?.name } }
      );

      writeAudit("automation.overdue_invoice", "invoice", {
        entityId: invoice.id,
        details: `Invoice #${invoice.invoiceNumber || invoice.id} overdue — reminder task #${task.id} created`,
      });
    }
  }

  return overdue.length;
}

// ──────────────────────────────────────────────
// Rule 3: High-value clients need engagement
// ──────────────────────────────────────────────
async function checkHighValueClients() {
  const [allInvoices, allClients] = await Promise.all([
    db.select().from(invoices),
    db.select().from(clients),
  ]);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const client of allClients.filter(c => c.status === "active")) {
    const paidInvoices = allInvoices.filter(i =>
      (i as any).clientId === (client as any).id && i.status === "paid"
    );
    const totalPaid = paidInvoices.reduce((s, i) => s + parseFloat(i.amount || "0"), 0);

    if (totalPaid >= 5000) {
      const lastPaid = paidInvoices
        .filter(i => i.paidDate)
        .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())[0];

      if (lastPaid && new Date(lastPaid.paidDate!) < thirtyDaysAgo) {
        await emitEvent("high_value_reactivation", "CLIENT",
          `High-value client needs reactivation: ${client.name} ($${totalPaid.toFixed(0)} paid)`,
          { entityId: (client as any).id, entityType: "client", meta: { totalPaid, lastPaidDate: lastPaid.paidDate } }
        );
        writeAudit("automation.high_value_reactivation", "client", {
          entityId: (client as any).id,
          details: `High-value client "${client.name}" ($ ${totalPaid}) — last paid ${lastPaid.paidDate}`,
        });
      }
    }
  }
}

// ──────────────────────────────────────────────
// Rule 4: Hot leads need urgent follow-up
// ──────────────────────────────────────────────
async function checkHotLeads() {
  const allLeads = await db.select().from(leads);
  const hotLeads = allLeads.filter(l =>
    l.score === "hot" && l.stage !== "won" && l.stage !== "lost"
  );

  for (const lead of hotLeads) {
    await emitEvent("hot_lead_alert", "LEAD",
      `Hot lead: ${lead.name}${lead.budget ? ` ($${lead.budget} budget)` : ""}`,
      { entityId: lead.id, entityType: "lead", meta: { score: lead.score, budget: lead.budget, stage: lead.stage } }
    );
  }

  return hotLeads.length;
}

// ─── Run all rules ───
router.post("/automation-engine/run", async (req, res) => {
  try {
    const results = await Promise.all([
      checkStaleLeads(),
      checkOverdueInvoices(),
      checkHighValueClients(),
      checkHotLeads(),
    ]);

    writeAudit("automation_engine.run", "system", {
      details: `Revenue automation ran — stale: ${results[0]}, overdue inv: ${results[1]}`,
    });

    res.json({
      staleLeadsProcessed: results[0],
      overdueInvoicesProcessed: results[1],
      clientReactivationChecks: results[2],
      hotLeadAlerts: results[3],
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Automation engine failed");
    res.status(500).json({ error: "Automation engine failed" });
  }
});

// Get automation rule status
router.get("/automation-engine/status", async (req, res) => {
  try {
    const recent = await db.select().from(events)
      .orderBy(events.createdAt)
      .limit(20);

    const automationEvents = recent.filter(e =>
      ["lead_stale_detected", "invoice_overdue", "high_value_reactivation", "hot_lead_alert"].includes(e.type)
    );

    res.json({
      rules: [
        { name: "stale_leads", description: "Follow-up task for leads idle > 7 days", enabled: true },
        { name: "overdue_invoices", description: "Reminder task for overdue invoices", enabled: true },
        { name: "high_value_reactivation", description: "Alert when high-value clients go cold (>30 days)", enabled: true },
        { name: "hot_lead_alert", description: "Alert for hot leads needing immediate follow-up", enabled: true },
      ],
      lastEvents: automationEvents.map(e => ({
        id: e.id, type: e.type, title: e.title, createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get automation status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
