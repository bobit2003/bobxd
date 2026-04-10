import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useListProjects, getListProjectsQueryKey,
  useListTasks, getListTasksQueryKey,
  useListMilestones,
  useGetRevenueIntelligence, getGetRevenueIntelligenceQueryKey,
  useGetSystemContext, getGetSystemContextQueryKey,
} from "@workspace/api-client-react";
import { FolderKanban, CheckSquare, Users, MessageSquare, Activity, AlertTriangle, DollarSign, Target, Clock, TrendingUp, ArrowUpRight, Radio, Zap, ShieldAlert, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type LiveEvent = {
  id: number;
  type: string;
  category: string;
  title: string;
  description?: string | null;
  createdAt: string;
};

const categoryColor: Record<string, string> = {
  CLIENT: "text-primary",
  LEAD: "text-green-400",
  TASK: "text-violet-400",
  FIN: "text-amber-400",
  AI: "text-purple-400",
  AUTO: "text-cyan-400",
  SYS: "text-white/60",
};

function useLiveEventFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const queryClient = useQueryClient();

  const addEvent = useCallback((ev: LiveEvent) => {
    setEvents(prev => {
      const next = [ev, ...prev];
      if (next.length > 60) next.pop();
      return next;
    });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSystemContextQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRevenueIntelligenceQueryKey() });
  }, [queryClient]);

  useEffect(() => {
    const url = "/api/events/stream";
    let evtSource: EventSource;
    let retry: ReturnType<typeof setTimeout>;

    function connect() {
      evtSource = new EventSource(url);

      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as LiveEvent;
          addEvent(data);
        } catch {}
      };

      evtSource.onerror = () => {
        evtSource.close();
        retry = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      evtSource?.close();
      clearTimeout(retry);
    };
  }, [addEvent]);

  return events;
}

function StatCard({ title, value, icon: Icon, subtitle, href, delay, accent }: {
  title: string; value: number | string; icon: React.ElementType; subtitle?: string; href: string; delay: number; accent?: string;
}) {
  return (
    <Link href={href}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
        <div className={`glass-card p-4 rounded-lg cursor-pointer h-full relative overflow-hidden group border ${accent ? accent : 'border-white/5'}`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <h3 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{title}</h3>
            <Icon className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-all" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground mb-1 relative z-10">{value}</div>
          {subtitle && <div className="text-[9px] text-muted-foreground/60 uppercase tracking-widest relative z-10">{subtitle}</div>}
        </div>
      </motion.div>
    </Link>
  );
}

function AlertBadge({ type, message }: { type: string; message: string }) {
  const isHigh = type.includes("overdue") || type.includes("high");
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border text-xs ${isHigh ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
      <ShieldAlert className="w-3 h-3 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: tasks } = useListTasks({ query: { queryKey: getListTasksQueryKey() } });
  const { data: milestones } = useListMilestones();
  const { data: revenueIntel } = useGetRevenueIntelligence({ query: { queryKey: getGetRevenueIntelligenceQueryKey(), staleTime: 60000 } });
  const { data: sysCtx } = useGetSystemContext({ query: { queryKey: getGetSystemContextQueryKey(), staleTime: 30000 } });

  const liveEvents = useLiveEventFeed();
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [liveEvents.length]);

  const activeProjects = projects?.filter(p => p.status === "active") ?? [];

  const getProjectProgress = (projectId: number) => {
    const projMilestones = milestones?.filter(m => m.projectId === projectId) ?? [];
    if (projMilestones.length === 0) {
      const projTasks = tasks?.filter(t => t.projectId === projectId) ?? [];
      if (projTasks.length === 0) return 0;
      return Math.round((projTasks.filter(t => t.status === "done").length / projTasks.length) * 100);
    }
    return Math.round((projMilestones.filter(m => m.status === "completed").length / projMilestones.length) * 100);
  };

  const pendingTasks = tasks?.filter(t => t.status !== "done").sort((a, b) => {
    const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (p[b.priority] ?? 0) - (p[a.priority] ?? 0);
  }).slice(0, 8) ?? [];

  const alerts = sysCtx?.alerts ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-primary uppercase glow-text">Command Center</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Global Telemetry & Oversight</p>
        </div>
        {sysCtx && (
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-[9px] text-green-400 uppercase tracking-widest font-mono">Live</span>
          </div>
        )}
      </div>

      {/* Stat Row */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-3 md:grid-cols-5 shrink-0">
          {[1,2,3,4,5].map(i => <div key={i} className="glass-card rounded-lg h-20"><Skeleton className="h-full bg-white/5" /></div>)}
        </div>
      ) : data ? (
        <div className="grid gap-2.5 grid-cols-3 md:grid-cols-5 shrink-0">
          <StatCard delay={0.0} title="Projects" value={data.totalProjects} subtitle={`${data.activeProjects} active`} icon={FolderKanban} href="/projects" />
          <StatCard delay={0.05} title="Tasks" value={data.totalTasks} subtitle={`${data.pendingTasks} pending`} icon={CheckSquare} href="/tasks" />
          <StatCard delay={0.1} title="Clients" value={data.totalClients} subtitle={`${data.activeClients} active`} icon={Users} href="/clients" />
          <StatCard delay={0.15} title="Leads" value={data.totalLeads} subtitle={`${data.hotLeads} hot`} icon={Target} href="/leads" />
          <StatCard delay={0.2} title="AI Sessions" value={data.totalConversations} subtitle="Neural active" icon={MessageSquare} href="/ai" />
        </div>
      ) : null}

      {/* Finance + Alerts Row */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-green-500/10 border border-green-500/15 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-widest text-green-400/70 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Revenue</p>
            <p className="text-xl font-bold font-mono text-green-400 mt-1">${data.revenue}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-amber-500/10 border border-amber-500/15 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-widest text-amber-400/70 flex items-center gap-1"><Clock className="w-3 h-3" /> Unpaid</p>
            <p className="text-xl font-bold font-mono text-amber-400 mt-1">${data.unpaidAmount}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-primary/10 border border-primary/15 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-widest text-primary/70 flex items-center gap-1"><Activity className="w-3 h-3" /> Billable</p>
            <p className="text-xl font-bold font-mono text-primary mt-1">{data.billableHours}h</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-violet-500/10 border border-violet-500/15 rounded-lg p-3">
            <p className="text-[9px] uppercase tracking-widest text-violet-400/70 flex items-center gap-1"><Zap className="w-3 h-3" /> Automations</p>
            <p className="text-xl font-bold font-mono text-violet-400 mt-1">{data.activeAutomations}</p>
          </motion.div>
        </div>
      )}

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="flex items-center gap-2 flex-wrap shrink-0">
          <Bell className="w-3 h-3 text-muted-foreground shrink-0" />
          {alerts.slice(0, 3).map((a, i) => (
            <AlertBadge key={i} type={a.type} message={a.message} />
          ))}
        </motion.div>
      )}

      {/* Revenue Engine Panel */}
      {revenueIntel && revenueIntel.opportunities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-card rounded-lg border border-amber-500/20 bg-amber-500/5 shrink-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10">
            <h2 className="text-[10px] font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Revenue Engine
            </h2>
            <Link href="/clients">
              <span className="text-[9px] text-amber-400/60 uppercase tracking-widest hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1">
                Intelligence <ArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap divide-x divide-amber-500/10">
            {revenueIntel.opportunities.slice(0, 3).map((opp, i) => (
              <div key={i} className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${opp.urgency === "high" ? "bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.6)]" : opp.urgency === "medium" ? "bg-amber-400" : "bg-primary/50"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-foreground/90 truncate leading-tight">{opp.label}</div>
                  <div className={`text-[9px] uppercase tracking-widest ${opp.urgency === "high" ? "text-red-400" : opp.urgency === "medium" ? "text-amber-400" : "text-muted-foreground"}`}>
                    {opp.urgency} priority
                  </div>
                </div>
                {opp.value && opp.value !== "Unknown" && (
                  <div className="text-amber-400 font-bold font-mono text-sm shrink-0">{opp.value}</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">

        {/* Live Event Feed */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Radio className="w-3 h-3 text-primary animate-pulse" />
            <h2 className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Live Event Feed</h2>
            {liveEvents.length > 0 && (
              <span className="ml-auto text-[9px] text-muted-foreground font-mono">{liveEvents.length} events</span>
            )}
          </div>
          <div ref={feedRef} className="glass-card flex-1 rounded-lg overflow-y-auto font-mono text-[11px] leading-relaxed">
            {liveEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                Waiting for events...
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="flex gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                    <span className="text-muted-foreground/40 shrink-0 text-[9px] mt-0.5 tabular-nums">
                      {new Date(ev.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={`shrink-0 w-10 text-[9px] font-bold uppercase mt-0.5 ${categoryColor[ev.category] ?? "text-muted-foreground"}`}>
                      {ev.category}
                    </span>
                    <span className="text-foreground/80 flex-1 min-w-0 break-words">{ev.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <FolderKanban className="w-3 h-3 text-primary/70" />
            <h2 className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Active Directives</h2>
            <Link href="/projects">
              <span className="ml-auto text-[9px] text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-widest">
                All
              </span>
            </Link>
          </div>
          <div className="glass-card flex-1 rounded-lg p-3 overflow-y-auto space-y-2.5">
            {activeProjects.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                No active directives
              </div>
            ) : activeProjects.map(p => {
              const progress = getProjectProgress(p.id);
              return (
                <div key={p.id} className="bg-black/40 border border-white/5 rounded p-3 hover:border-primary/20 transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs tracking-tight truncate text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)] shrink-0 ml-2" />
                  </div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{p.type}</span>
                    <span className="text-[9px] font-mono text-primary/70">{progress}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-0.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Queue */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <AlertTriangle className="w-3 h-3 text-primary/70" />
            <h2 className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Priority Queue</h2>
            <Link href="/tasks">
              <span className="ml-auto text-[9px] text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-widest">
                All
              </span>
            </Link>
          </div>
          <div className="glass-card flex-1 rounded-lg p-3 overflow-y-auto space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                Queue empty
              </div>
            ) : pendingTasks.map(t => (
              <div key={t.id} className="flex items-start gap-2.5 bg-black/40 border border-white/5 rounded p-2.5 hover:border-white/10 transition-colors">
                <div className={`w-0.5 h-full min-h-[28px] rounded-full shrink-0 ${
                  t.priority === "high" ? "bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.5)]" :
                  t.priority === "medium" ? "bg-amber-500" : "bg-white/15"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    <span className={t.priority === "high" ? "text-destructive" : t.priority === "medium" ? "text-amber-500" : ""}>
                      {t.priority}
                    </span>
                    {" — "}{t.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
