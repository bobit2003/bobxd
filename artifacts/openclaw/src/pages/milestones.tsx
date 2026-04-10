import { useState } from "react";
import {
  useListMilestones, getListMilestonesQueryKey,
  useCreateMilestone, useUpdateMilestone, useDeleteMilestone,
  useListProjects
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Flag, CheckCircle, AlertCircle, Clock3 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock3, color: "text-white/50", label: "PENDING" },
  in_progress: { icon: AlertCircle, color: "text-amber-400", label: "IN PROGRESS" },
  completed: { icon: CheckCircle, color: "text-green-400", label: "COMPLETED" },
  overdue: { icon: AlertCircle, color: "text-red-400", label: "OVERDUE" },
};

export default function Milestones() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ projectId: "", title: "", dueDate: "" });

  const { data: milestones, isLoading } = useListMilestones();
  const { data: projects } = useListProjects();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMilestonesQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) return;
    createMilestone.mutate({
      data: {
        projectId: Number(formData.projectId),
        title: formData.title,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined
      } as any
    }, {
      onSuccess: () => { invalidate(); setIsCreateOpen(false); setFormData({ projectId: "", title: "", dueDate: "" }); }
    });
  };

  const handleToggle = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    updateMilestone.mutate({ id, data: { status: newStatus } }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this milestone?")) deleteMilestone.mutate({ id }, { onSuccess: invalidate });
  };

  const projectName = (pid: number | null | undefined) => projects?.find(p => p.id === pid)?.name || "Unknown";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Milestones</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Project Checkpoints & Deliverables</p>
        </div>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary"><Plus className="w-4 h-4" /> New Milestone</Button>
          </SheetTrigger>
          <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
            <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">Add Milestone</SheetTitle></SheetHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <Input placeholder="Title *" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" required />
              {projects?.length ? (
                <Select value={formData.projectId} onValueChange={v => setFormData(p => ({ ...p, projectId: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              <Input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createMilestone.isPending}>
                {createMilestone.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Milestone"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !milestones?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No milestones set</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3">
          {milestones.map((ms, i) => {
            const cfg = statusConfig[ms.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <motion.div key={ms.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white/[0.03] border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => handleToggle(ms.id, ms.status)}>
                    <Icon className={`w-5 h-5 ${cfg.color} shrink-0`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${ms.status === "completed" ? "text-white/40 line-through" : "text-white"}`}>{ms.title}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{projectName(ms.projectId)}</span>
                        <span className={cfg.color}>{cfg.label}</span>
                        {ms.dueDate && <span>Due: {new Date(ms.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(ms.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
