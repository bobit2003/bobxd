import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useListProjects, getListProjectsQueryKey, useListTasks, getListTasksQueryKey } from "@workspace/api-client-react";
import { FolderKanban, CheckSquare, Users, Zap, MessageSquare, Activity, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    
    let totalDuration = 1000;
    let incrementTime = (totalDuration / end);
    
    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

function StatCard({ title, value, icon: Icon, subtitle, href, delay }: { title: string, value: number, icon: any, subtitle?: string, href: string, delay: number }) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
      >
        <div className="glass-card p-4 rounded-lg cursor-pointer h-full relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">{title}</h3>
            <Icon className="h-4 w-4 text-primary group-hover:glow-text transition-all" />
          </div>
          <div className="text-4xl font-bold font-mono text-foreground mb-1 relative z-10">
            <AnimatedCounter value={value} />
          </div>
          {subtitle && (
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-widest relative z-10">
              {subtitle}
            </div>
          )}
          
          {/* Fake Sparkline */}
          <div className="absolute bottom-0 left-0 w-full h-8 opacity-20 pointer-events-none">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
              <path d={`M0,${20 - Math.random()*15} L20,${20 - Math.random()*15} L40,${20 - Math.random()*15} L60,${20 - Math.random()*15} L80,${20 - Math.random()*15} L100,${20 - Math.random()*15}`} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

const fakeLogs = [
  { type: 'AI', msg: 'Neural model weights synchronized.' },
  { type: 'TASK', msg: 'Background cleanup job finished.' },
  { type: 'SYS', msg: 'Memory allocation optimized.' },
  { type: 'AUTO', msg: 'Trigger [DataSync] fired successfully.' },
  { type: 'SEC', msg: 'Firewall definitions updated.' },
  { type: 'CLIENT', msg: 'Incoming connection established.' },
];

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: projects } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const { data: tasks } = useListTasks({
    query: { queryKey: getListTasksQueryKey() }
  });

  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const pendingTasks = tasks?.filter(t => t.status !== 'done').sort((a, b) => {
    const p = { high: 3, medium: 2, low: 1 };
    return p[b.priority as keyof typeof p] - p[a.priority as keyof typeof p];
  }) || [];

  const [logs, setLogs] = useState<{id: number, time: string, type: string, msg: string}[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialLogs = Array.from({length: 5}).map((_, i) => ({
      id: Date.now() - (5-i)*1000,
      time: new Date(Date.now() - (5-i)*1000).toLocaleTimeString('en-US', { hour12: false }),
      ...fakeLogs[Math.floor(Math.random() * fakeLogs.length)]
    }));
    setLogs(initialLogs);

    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          ...fakeLogs[Math.floor(Math.random() * fakeLogs.length)]
        };
        const next = [...prev, newLog];
        if (next.length > 50) next.shift();
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 h-full flex flex-col"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Command Center</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Global Telemetry & Oversight</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5 shrink-0">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card p-4 rounded-lg h-28">
              <Skeleton className="h-3 w-16 mb-4 bg-white/5" />
              <Skeleton className="h-8 w-12 bg-white/5" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5 shrink-0">
          <StatCard delay={0.0} title="Projects" value={data.totalProjects} subtitle={`${data.activeProjects} active`} icon={FolderKanban} href="/projects" />
          <StatCard delay={0.1} title="Tasks" value={data.totalTasks} subtitle={`${data.pendingTasks} pending`} icon={CheckSquare} href="/tasks" />
          <StatCard delay={0.2} title="Clients" value={data.totalClients} subtitle={`${data.activeClients} active`} icon={Users} href="/clients" />
          <StatCard delay={0.3} title="Automations" value={data.totalAutomations} subtitle={`${data.activeAutomations} active`} icon={Zap} href="/automations" />
          <StatCard delay={0.4} title="AI Links" value={data.totalConversations} subtitle="Neural Active" icon={MessageSquare} href="/ai" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Column: Activity Feed */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <h2 className="text-xs font-bold tracking-widest mb-3 text-primary/70 uppercase flex items-center gap-2 shrink-0">
            <Activity className="w-3 h-3" /> System Activity Feed
          </h2>
          <div className="glass-card flex-1 rounded-lg p-3 overflow-y-auto font-mono text-[11px] leading-relaxed relative">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-transparent h-8 z-10" />
            <div className="space-y-1 mt-2">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-white/5 px-1 py-0.5 rounded transition-colors group">
                  <span className="text-primary/50 shrink-0">[{log.time}]</span>
                  <span className={`shrink-0 w-12 ${
                    log.type === 'AI' ? 'text-purple-400' :
                    log.type === 'AUTO' ? 'text-amber-400' :
                    log.type === 'SEC' ? 'text-red-400' :
                    'text-primary'
                  }`}>{log.type}</span>
                  <span className="text-foreground/80 group-hover:text-foreground transition-colors break-words">{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Right Columns: Projects & Tasks */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          
          {/* Active Projects */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-xs font-bold tracking-widest mb-3 text-primary/70 uppercase flex items-center gap-2 shrink-0">
              <FolderKanban className="w-3 h-3" /> Active Directives
            </h2>
            <div className="glass-card flex-1 rounded-lg p-3 overflow-y-auto space-y-3">
              {activeProjects.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">No active directives.</div>
              ) : activeProjects.map(p => {
                const fakeProgress = Math.floor(Math.random() * 40) + 20; // 20-60%
                return (
                  <div key={p.id} className="bg-black/40 border border-white/5 rounded p-3 hover:border-primary/30 transition-colors group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">{p.name}</span>
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{p.type}</div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${fakeProgress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Queue */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-xs font-bold tracking-widest mb-3 text-primary/70 uppercase flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-3 h-3" /> Priority Queue
            </h2>
            <div className="glass-card flex-1 rounded-lg p-3 overflow-y-auto space-y-2">
              {pendingTasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest">Queue empty.</div>
              ) : pendingTasks.map(t => (
                <div key={t.id} className="flex items-start gap-3 bg-black/40 border border-white/5 rounded p-2.5 hover:border-white/10 transition-colors">
                  <div className={`w-1 h-full min-h-[30px] rounded-full shrink-0 ${
                    t.priority === 'high' ? 'bg-destructive shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                    t.priority === 'medium' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' :
                    'bg-white/20'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-2">
                      <span className={t.priority === 'high' ? 'text-destructive' : t.priority === 'medium' ? 'text-amber-500' : ''}>
                        {t.priority} PRI
                      </span>
                      <span>•</span>
                      <span>{t.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
