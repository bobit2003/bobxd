import { useGetDailyBriefing, getGetDailyBriefingQueryKey } from "@workspace/api-client-react";
import { Sunrise, AlertTriangle, CheckSquare, FolderKanban, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Briefing() {
  const { data: briefing, isLoading } = useGetDailyBriefing({
    query: { queryKey: getGetDailyBriefingQueryKey() }
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col overflow-hidden max-w-4xl mx-auto">
      <div className="shrink-0 flex items-center justify-between border-b border-primary/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-widest mb-2 text-primary uppercase glow-text flex items-center gap-4">
            <Sunrise className="w-8 h-8" /> COMMAND BRIEFING
          </h1>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Classified Intel // Eyes Only</p>
        </div>
        <div className="text-right font-mono">
          <div className="text-amber-500 font-bold uppercase tracking-widest glow-text-amber">{isLoading ? "SYNCING..." : briefing?.date}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">SYS.STATUS: NOMINAL</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-8 pr-2">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3 bg-white/5" />
            <div className="grid grid-cols-4 gap-4"><Skeleton className="h-24 bg-white/5" /><Skeleton className="h-24 bg-white/5" /><Skeleton className="h-24 bg-white/5" /><Skeleton className="h-24 bg-white/5" /></div>
            <Skeleton className="h-32 bg-white/5" />
            <Skeleton className="h-40 bg-white/5" />
          </div>
        ) : !briefing ? (
          <div className="h-full flex items-center justify-center text-sm text-destructive uppercase tracking-widest">Failed to retrieve briefing data.</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            
            {/* Greeting */}
            <div className="text-xl text-foreground font-mono leading-relaxed border-l-2 border-primary pl-4 py-1">
              {briefing.greeting}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded border border-white/5 text-center">
                <CheckSquare className="w-5 h-5 text-primary mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-primary glow-text">{briefing.tasksDueToday}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Tasks Due</div>
              </div>
              <div className="glass-card p-4 rounded border border-destructive/20 bg-destructive/5 text-center">
                <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-destructive">{briefing.tasksOverdue}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Overdue</div>
              </div>
              <div className="glass-card p-4 rounded border border-white/5 text-center">
                <FolderKanban className="w-5 h-5 text-primary mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-primary glow-text">{briefing.activeProjects}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Active Projects</div>
              </div>
              <div className="glass-card p-4 rounded border border-amber-500/20 bg-amber-500/5 text-center">
                <Flame className="w-5 h-5 text-amber-500 mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-amber-500 glow-text-amber">{briefing.currentStreak}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Day Streak</div>
              </div>
            </div>

            {/* Top Priorities */}
            <div className="glass-card rounded-lg p-6 border border-primary/20">
              <h3 className="text-sm font-bold tracking-widest mb-4 text-primary uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Top Priorities
              </h3>
              {briefing.topPriorities.length > 0 ? (
                <ul className="space-y-3">
                  {briefing.topPriorities.map((priority, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-mono text-foreground/90">
                      <span className="text-primary mt-0.5">[{i+1}]</span>
                      <span>{priority}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm font-mono text-muted-foreground uppercase">No critical priorities identified for today.</div>
              )}
            </div>

            {/* AI Insight */}
            <div className="glass-card rounded-lg p-6 border border-purple-500/30 bg-purple-500/5">
              <h3 className="text-sm font-bold tracking-widest mb-3 text-purple-400 uppercase flex items-center gap-2">
                Neural Insight
              </h3>
              <div className="text-sm font-mono text-purple-100/80 leading-relaxed italic">
                "{briefing.aiInsight}"
              </div>
            </div>

            {/* Quote */}
            <div className="text-center py-8 opacity-60">
              <div className="text-lg font-serif italic mb-2">"{briefing.quote}"</div>
              <div className="text-[10px] uppercase tracking-widest font-mono">- TRANSMISSION END -</div>
            </div>
            
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
