import { useListHabits, getListHabitsQueryKey, useCreateHabit, useDeleteHabit, useCompleteHabit } from "@workspace/api-client-react";
import { Flame, Plus, Trash2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Habits() {
  const queryClient = useQueryClient();
  const { data: habits, isLoading } = useListHabits({
    query: { queryKey: getListHabitsQueryKey() }
  });
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const completeHabit = useCompleteHabit();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", frequency: "daily" });

  const handleSave = async () => {
    await createHabit.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
    setIsDialogOpen(false);
    setFormData({ name: "", description: "", frequency: "daily" });
  };

  const handleComplete = async (id: number) => {
    await completeHabit.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    await deleteHabit.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Habit Tracker</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Behavioral Diagnostics</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary transition-all">
              <Plus className="w-4 h-4 mr-2" /> NEW PROTOCOL
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono tracking-widest uppercase">Define Protocol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="PROTOCOL NAME" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="DESCRIPTION" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Button onClick={handleSave} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 uppercase">INITIALIZE</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {isLoading ? (
          [1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 w-full bg-white/5" />)
        ) : habits?.length === 0 ? (
          <div className="col-span-full h-32 flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">No active protocols.</div>
        ) : (
          habits?.map(habit => {
            const isCompletedToday = habit.lastCompleted?.startsWith(today);
            return (
              <motion.div key={habit.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`glass-card p-4 rounded-lg relative overflow-hidden group border ${isCompletedToday ? 'border-primary/50' : 'border-white/5'}`}>
                {isCompletedToday && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className={`font-bold uppercase tracking-wider ${isCompletedToday ? 'text-primary glow-text' : 'text-foreground'}`}>{habit.name}</h3>
                    {habit.description && <p className="text-[10px] text-muted-foreground mt-1 uppercase">{habit.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(habit.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                  <div className="bg-black/40 border border-white/5 rounded p-2 text-center">
                    <div className="text-2xl font-bold font-mono text-amber-500 glow-text-amber">{habit.streak}</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Current Streak</div>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded p-2 text-center">
                    <div className="text-2xl font-bold font-mono text-primary glow-text">{habit.bestStreak}</div>
                    <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Best Streak</div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleComplete(habit.id)}
                  disabled={isCompletedToday}
                  className={`w-full relative z-10 transition-all ${isCompletedToday ? 'bg-primary/20 text-primary border border-primary/50 cursor-not-allowed' : 'bg-white/5 hover:bg-primary/20 hover:text-primary hover:border-primary/50 text-foreground border border-white/10'}`}
                >
                  {isCompletedToday ? (
                    <><Check className="w-4 h-4 mr-2" /> LOGGED</>
                  ) : (
                    <><Flame className="w-4 h-4 mr-2" /> LOG COMPLETION</>
                  )}
                </Button>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
