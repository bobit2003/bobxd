import { useState } from "react";
import {
  useListInvoices, getListInvoicesQueryKey,
  useCreateInvoice, useUpdateInvoice, useDeleteInvoice,
  useGetFinancialSummary, getGetFinancialSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, FileText, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  draft: "bg-white/10 text-white/60 border-white/20",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-white/5 text-white/30 border-white/10",
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: "", amount: "", currency: "USD", status: "draft", dueDate: "", items: "", notes: ""
  });

  const { data: invoices, isLoading } = useListInvoices();
  const { data: summary } = useGetFinancialSummary();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFinancialSummaryQueryKey() });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoice.mutate({ data: { ...formData, dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined } as any }, {
      onSuccess: () => { invalidate(); setIsCreateOpen(false); setFormData({ invoiceNumber: "", amount: "", currency: "USD", status: "draft", dueDate: "", items: "", notes: "" }); }
    });
  };

  const handleMarkPaid = (id: number) => {
    updateInvoice.mutate({ id, data: { status: "paid", paidDate: new Date().toISOString() } }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this invoice?")) deleteLead(id);
  };

  function deleteLead(id: number) {
    deleteInvoice.mutate({ id }, { onSuccess: invalidate });
  }

  const totalUnpaid = invoices?.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + parseFloat(i.amount || "0"), 0) || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Invoices</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Billing & Revenue Tracking</p>
        </div>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary"><Plus className="w-4 h-4" /> New Invoice</Button>
          </SheetTrigger>
          <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
            <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">Create Invoice</SheetTitle></SheetHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <Input placeholder="Invoice # *" value={formData.invoiceNumber} onChange={e => setFormData(p => ({ ...p, invoiceNumber: e.target.value }))} className="bg-white/5 border-white/10" required />
              <Input placeholder="Amount *" type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="bg-white/5 border-white/10" required />
              <Input placeholder="Due date" type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Line items" value={formData.items} onChange={e => setFormData(p => ({ ...p, items: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Notes" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Invoice"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-green-400/70">Revenue</p>
            <p className="text-lg font-bold text-green-400 font-mono">${summary.totalRevenue}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-red-400/70">Expenses</p>
            <p className="text-lg font-bold text-red-400 font-mono">${summary.totalExpenses}</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-primary/70">Net Profit</p>
            <p className="text-lg font-bold text-primary font-mono">${summary.netProfit}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/70">Unpaid</p>
            <p className="text-lg font-bold text-amber-400 font-mono">${summary.unpaidAmount}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !invoices?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No invoices yet</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3">
          {invoices.map((inv, i) => (
            <motion.div key={inv.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-primary/60 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white">{inv.invoiceNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${statusColors[inv.status] || ""}`}>
                        {inv.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                      {inv.items && <span className="truncate max-w-[200px]">{inv.items}</span>}
                      {inv.dueDate && <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold font-mono text-white">${parseFloat(inv.amount || "0").toLocaleString()}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => handleMarkPaid(inv.id)}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDelete(inv.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
