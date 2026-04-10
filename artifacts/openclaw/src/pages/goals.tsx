import { useListGoals, getListGoalsQueryKey, useCreateGoal, useUpdateGoal, useDeleteGoal, useGenerateGoalStrategy, type Goal } from "@workspace/api-client-react";
import { Target, Plus, Trash2, Brain, ChevronDown, ChevronUp, Flame, Lightbulb, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type StrategyParsed = {
  steps: string[];
  habit: string;
  insight: string;
};

function parseStrategy(raw: string | null | undefined): StrategyParsed | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Goals() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useListGoals({
    query: { queryKey: getListGoalsQueryKey() }
  });
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const generateStrategy = useGenerateGoalStrategy();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "", progress: 0 });
  const [expandedStrategy, setExpandedStrategy] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);

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

  const handleGenerateStrategy = (id: number) => {
    setGeneratingId(id);
    generateStrategy.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey() });
        setExpandedStrategy(id);
        setGeneratingId(null);
      },
      onError: () => setGeneratingId(null)
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Mission Objectives</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Strategic Goal Tracking + AI Coach</p>
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
              <Button onClick={handleSave} disabled={createGoal.isPending || !formData.title.trim()} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 uppercase">INITIATE</Button>
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
          goals?.map((goal: Goal) => {
            const strategy = parseStrategy(goal.strategy);
            const isExpanded = expandedStrategy === goal.id;
            const isGenerating = generatingId === goal.id;

            return (
              <motion.div key={goal.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-lg overflow-hidden group relative border border-white/5 hover:border-primary/20 transition-colors">
                {/* Main goal row */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 uppercase tracking-widest shrink-0">{goal.category}</span>
                        <h3 className="font-bold text-foreground uppercase tracking-wider truncate">{goal.title}</h3>
                      </div>
                      {goal.description && <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{goal.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <div className="flex bg-black/50 rounded border border-white/10">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-none text-xs" onClick={() => handleProgress(goal.id, goal.progress, -10)}>-</Button>
                        <div className="flex items-center justify-center w-12 font-mono text-xs text-primary">{goal.progress}%</div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-none text-xs" onClick={() => handleProgress(goal.id, goal.progress, 10)}>+</Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded border transition-all ${isExpanded ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 border-white/5 hover:border-violet-500/20"}`}
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedStrategy(null);
                          } else if (strategy) {
                            setExpandedStrategy(goal.id);
                          } else {
                            handleGenerateStrategy(goal.id);
                          }
                        }}
                        disabled={isGenerating}
                        title={strategy ? "Toggle AI strategy" : "Generate AI strategy"}
                      >
                        {isGenerating ? <Target className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  {isGenerating && (
                    <p className="text-[9px] text-violet-400/60 uppercase tracking-widest mt-2 animate-pulse">AI Coach analyzing objective...</p>
                  )}
                </div>

                {/* AI Strategy Panel */}
                <AnimatePresence>
                  {isExpanded && strategy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-violet-500/10"
                    >
                      <div className="p-4 bg-violet-500/5 space-y-4">
                        {/* Insight */}
                        <div className="flex items-start gap-2.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-200/80 italic leading-relaxed">{strategy.insight}</p>
                        </div>

                        {/* Steps */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <ListChecks className="w-3 h-3 text-violet-400" />
                            <span className="text-[9px] text-violet-400 uppercase tracking-widest font-bold">Action Plan</span>
                          </div>
                          <ol className="space-y-1.5">
                            {strategy.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                                <span className="text-violet-400/60 font-mono shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Daily Habit */}
                        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[9px] text-amber-400 uppercase tracking-widest mb-0.5 font-bold">Daily Habit</div>
                            <p className="text-xs text-amber-100/80">{strategy.habit}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <button
                            onClick={() => handleGenerateStrategy(goal.id)}
                            disabled={isGenerating}
                            className="text-[9px] text-violet-400/50 hover:text-violet-400 uppercase tracking-widest transition-colors"
                          >
                            Regenerate
                          </button>
                          <button
                            onClick={() => setExpandedStrategy(null)}
                            className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground uppercase tracking-widest transition-colors flex items-center gap-1"
                          >
                            <ChevronUp className="w-3 h-3" /> Collapse
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Strategy teaser if not expanded but strategy exists */}
                {!isExpanded && strategy && (
                  <button
                    onClick={() => setExpandedStrategy(goal.id)}
                    className="w-full px-4 py-1.5 bg-violet-500/5 border-t border-violet-500/10 text-[9px] text-violet-400/50 uppercase tracking-widest hover:text-violet-400 hover:bg-violet-500/10 transition-all flex items-center justify-center gap-1"
                  >
                    <Brain className="w-2.5 h-2.5" /> View AI Strategy <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
