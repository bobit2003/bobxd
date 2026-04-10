import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, expenses, timeEntries } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/financial/summary", async (req, res) => {
  try {
    const allInvoices = await db.select().from(invoices);
    const allExpenses = await db.select().from(expenses);
    const allTime = await db.select().from(timeEntries);

    const paidInvoices = allInvoices.filter(i => i.status === "paid");
    const unpaidInvoices = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
    const totalExpenseAmt = allExpenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
    const unpaidAmount = unpaidInvoices.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
    const billableHours = allTime
      .filter(t => t.billable === "true")
      .reduce((sum, t) => sum + parseFloat(t.hours || "0"), 0);

    const recentTransactions = [
      ...paidInvoices.slice(0, 5).map(i => ({
        type: "income",
        description: `Invoice ${i.invoiceNumber}`,
        amount: i.amount,
        date: i.paidDate?.toISOString() || i.createdAt.toISOString(),
      })),
      ...allExpenses.slice(0, 5).map(e => ({
        type: "expense",
        description: e.description,
        amount: `-${e.amount}`,
        date: e.date.toISOString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    res.json({
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenseAmt.toFixed(2),
      netProfit: (totalRevenue - totalExpenseAmt).toFixed(2),
      unpaidInvoices: unpaidInvoices.length,
      unpaidAmount: unpaidAmount.toFixed(2),
      paidInvoices: paidInvoices.length,
      totalBillableHours: billableHours.toFixed(1),
      recentTransactions,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get financial summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
