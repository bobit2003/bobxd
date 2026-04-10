import { useGetDailyBriefing, getGetDailyBriefingQueryKey } from "@workspace/api-client-react";
import { Sunrise, AlertTriangle, CheckSquare, FolderKanban, Flame, DollarSign, Target, Clock, Flag, CalendarDays } from "lucide-react";
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
            
            <div className="text-xl text-foreground font-mono leading-relaxed border-l-2 border-primary pl-4 py-1">
              {briefing.greeting}
            </div>

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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4 rounded border border-green-500/20 bg-green-500/5 text-center">
                <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-green-400">{briefing.unpaidInvoices}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Unpaid Invoices</div>
                <div className="text-[10px] text-amber-400 font-mono mt-0.5">${briefing.unpaidAmount}</div>
              </div>
              <div className="glass-card p-4 rounded border border-red-500/20 bg-red-500/5 text-center">
                <Target className="w-5 h-5 text-red-400 mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-red-400">{briefing.hotLeads}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Hot Leads</div>
              </div>
              <div className="glass-card p-4 rounded border border-primary/20 bg-primary/5 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-primary">{briefing.billableHoursThisWeek}h</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Billable This Week</div>
              </div>
              <div className="glass-card p-4 rounded border border-violet-500/20 bg-violet-500/5 text-center">
                <CalendarDays className="w-5 h-5 text-violet-400 mx-auto mb-2 opacity-50" />
                <div className="text-2xl font-bold font-mono text-violet-400">{briefing.upcomingContent?.length || 0}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">Content Queued</div>
              </div>
            </div>

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

            {(briefing.upcomingMilestones?.length > 0 || briefing.upcomingContent?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {briefing.upcomingMilestones?.length > 0 && (
                  <div className="glass-card rounded-lg p-5 border border-amber-500/20 bg-amber-500/5">
                    <h3 className="text-xs font-bold tracking-widest mb-3 text-amber-400 uppercase flex items-center gap-2">
                      <Flag className="w-3.5 h-3.5" /> Upcoming Milestones
                    </h3>
                    <ul className="space-y-2">
                      {briefing.upcomingMilestones.map((ms, i) => (
                        <li key={i} className="text-xs font-mono text-amber-100/70 flex items-start gap-2">
                          <span className="text-amber-500 shrink-0">&gt;</span> {ms}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {briefing.upcomingContent?.length > 0 && (
                  <div className="glass-card rounded-lg p-5 border border-violet-500/20 bg-violet-500/5">
                    <h3 className="text-xs font-bold tracking-widest mb-3 text-violet-400 uppercase flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> Scheduled Content
                    </h3>
                    <ul className="space-y-2">
                      {briefing.upcomingContent.map((c, i) => (
                        <li key={i} className="text-xs font-mono text-violet-100/70 flex items-start gap-2">
                          <span className="text-violet-500 shrink-0">&gt;</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="glass-card rounded-lg p-6 border border-purple-500/30 bg-purple-500/5">
              <h3 className="text-sm font-bold tracking-widest mb-3 text-purple-400 uppercase flex items-center gap-2">
                Neural Insight
              </h3>
              <div className="text-sm font-mono text-purple-100/80 leading-relaxed italic">
                "{briefing.aiInsight}"
              </div>
            </div>

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
