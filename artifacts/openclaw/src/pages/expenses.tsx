import { useState } from "react";
import {
  useListExpenses, getListExpensesQueryKey,
  useCreateExpense, useDeleteExpense
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Receipt } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

const categoryColors: Record<string, string> = {
  software: "text-violet-400",
  hosting: "text-blue-400",
  ai_tools: "text-emerald-400",
  domain: "text-amber-400",
  hardware: "text-red-400",
  marketing: "text-pink-400",
  other: "text-white/60",
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "", amount: "", currency: "USD", category: "software", date: new Date().toISOString().slice(0, 10)
  });

  const { data: expenses, isLoading } = useListExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate({ data: { ...formData, date: new Date(formData.date).toISOString() } as any }, {
      onSuccess: () => { invalidate(); setIsCreateOpen(false); setFormData({ description: "", amount: "", currency: "USD", category: "software", date: new Date().toISOString().slice(0, 10) }); }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this expense?")) deleteExpense.mutate({ id }, { onSuccess: invalidate });
  };

  const totalExpenses = expenses?.reduce((s, e) => s + parseFloat(e.amount || "0"), 0) || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Expenses</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Cost Tracking & Categories</p>
        </div>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary"><Plus className="w-4 h-4" /> Log Expense</Button>
          </SheetTrigger>
          <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
            <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">New Expense</SheetTitle></SheetHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <Input placeholder="Description *" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10" required />
              <Input placeholder="Amount *" type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="bg-white/5 border-white/10" required />
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="hosting">Hosting</SelectItem>
                  <SelectItem value="ai_tools">AI Tools</SelectItem>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createExpense.isPending}>
                {createExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Expense"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-red-400/70">Total Expenses</p>
        <p className="text-2xl font-bold text-red-400 font-mono">${totalExpenses.toFixed(2)}</p>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !expenses?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No expenses logged</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {expenses.map((exp, i) => (
            <motion.div key={exp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-lg p-3 hover:border-primary/30 transition-all group flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 text-primary/50" />
                <div>
                  <p className="text-sm text-white">{exp.description}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className={categoryColors[exp.category] || "text-white/50"}>{exp.category}</span>
                    <span>{new Date(exp.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-red-400">${parseFloat(exp.amount || "0").toFixed(2)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(exp.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
