import { useListGoals, getListGoalsQueryKey, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@workspace/api-client-react";
import { Target, Plus, Trash2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Goals() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListGoals({
    query: { queryKey: getListGoalsQueryKey() }
  });
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "", progress: 0 });

  const handleSave = async () => {
    await createGoal.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
    setIsDialogOpen(false);
    setFormData({ title: "", description: "", category: "", progress: 0 });
  };

  const handleProgress = async (id: number, currentProgress: number, change: number) => {
    const newProgress = Math.min(100, Math.max(0, currentProgress + change));
    await updateGoal.mutateAsync({ id, data: { progress: newProgress } });
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    await deleteGoal.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Mission Objectives</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Strategic Goal Tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary transition-all">
              <Plus className="w-4 h-4 mr-2" /> NEW OBJECTIVE
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono tracking-widest uppercase">Define Objective</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="OBJECTIVE TITLE" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="CATEGORY" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="DESCRIPTION" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Button onClick={handleSave} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 uppercase">INITIATE</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
        {isLoading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-white/5" />)
        ) : goals?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">No active objectives.</div>
        ) : (
          goals?.map(goal => (
            <motion.div key={goal.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-4 rounded-lg relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 uppercase tracking-widest">{goal.category}</span>
                    <h3 className="font-bold text-foreground uppercase tracking-wider">{goal.title}</h3>
                  </div>
                  {goal.description && <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{goal.description}</p>}
                </div>
                <div className="flex gap-2">
                  <div className="flex bg-black/50 rounded border border-white/10">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-none" onClick={() => handleProgress(goal.id, goal.progress, -10)}>-</Button>
                    <div className="flex items-center justify-center w-12 font-mono text-xs text-primary">{goal.progress}%</div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-none" onClick={() => handleProgress(goal.id, goal.progress, 10)}>+</Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="relative h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 z-10">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                {/* Milestone markers could go here */}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
