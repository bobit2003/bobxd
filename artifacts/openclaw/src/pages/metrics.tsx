import {
  useListMetrics, getListMetricsQueryKey, useCreateMetric,
  useListInvoices, getListInvoicesQueryKey,
  useListTasks, getListTasksQueryKey,
  useListHabits, getListHabitsQueryKey,
  useListAuditLog, getListAuditLogQueryKey,
  type Invoice, type Task, type Habit, type AuditLogEntry, type MetricEntry,
} from "@workspace/api-client-react";
import { BarChart3, Plus, Activity, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekLabel(isoWeekKey: string): string {
  const [, weekPart] = isoWeekKey.split("-W");
  const weekNum = parseInt(weekPart, 10);
  const year = parseInt(isoWeekKey.split("-W")[0], 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = (jan4.getDay() + 6) % 7;
  const weekStart = new Date(jan4.getTime() - dayOfWeek * 86400000 + (weekNum - 1) * 7 * 86400000);
  return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLast12WeekKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    keys.push(getISOWeekKey(d));
  }
  return keys;
}

const chartTooltipStyle = {
  backgroundColor: "#111",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 11,
  fontFamily: "JetBrains Mono, monospace",
};

const axisStyle = { fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "JetBrains Mono, monospace" };

export default function Metrics() {
  const queryClient = useQueryClient();
  const { data: metrics, isLoading } = useListMetrics({ query: { queryKey: getListMetricsQueryKey() } });
  const { data: invoices } = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });
  const { data: tasks } = useListTasks({ query: { queryKey: getListTasksQueryKey() } });
  const { data: habits } = useListHabits({ query: { queryKey: getListHabitsQueryKey() } });
  const { data: auditEntries } = useListAuditLog({ query: { queryKey: getListAuditLogQueryKey() } });

  const createMetric = useCreateMetric();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", value: "", unit: "", category: "general" });

  const handleSave = async () => {
    await createMetric.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() });
    setIsDialogOpen(false);
    setFormData({ name: "", value: "", unit: "", category: "general" });
  };

  const weekKeys = useMemo(() => getLast12WeekKeys(), []);

  const revenueData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    weekKeys.forEach(k => { byWeek[k] = 0; });
    invoices?.filter((i: Invoice) => i.status === "paid" && i.updatedAt).forEach((i: Invoice) => {
      const key = getISOWeekKey(new Date(i.updatedAt!));
      if (key in byWeek) byWeek[key] += parseFloat(i.amount ?? "0");
    });
    return weekKeys.map(k => ({ week: getWeekLabel(k), revenue: parseFloat(byWeek[k].toFixed(2)) }));
  }, [invoices, weekKeys]);

  const tasksData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    weekKeys.forEach(k => { byWeek[k] = 0; });
    tasks?.filter((t: Task) => t.status === "done" && t.updatedAt).forEach((t: Task) => {
      const key = getISOWeekKey(new Date(t.updatedAt!));
      if (key in byWeek) byWeek[key] += 1;
    });
    return weekKeys.map(k => ({ week: getWeekLabel(k), completed: byWeek[k] }));
  }, [tasks, weekKeys]);

  const habitData = useMemo(() => {
    const totalHabits = habits?.length ?? 0;
    const logsByWeek: Record<string, Set<string>> = {};
    weekKeys.forEach(k => { logsByWeek[k] = new Set(); });

    auditEntries?.filter((e: AuditLogEntry) => e.entity === "habit" && e.action === "habit.log" && e.createdAt).forEach((e: AuditLogEntry) => {
      const key = getISOWeekKey(new Date(e.createdAt!));
      if (key in logsByWeek && e.entityId) logsByWeek[key].add(`${e.entityId}-${key}`);
    });

    return weekKeys.map(k => {
      const logCount = logsByWeek[k].size;
      const possible = totalHabits * 7;
      const rate = possible > 0 ? Math.min(100, parseFloat(((logCount / possible) * 100).toFixed(1))) : 0;
      return { week: getWeekLabel(k), rate };
    });
  }, [auditEntries, habits, weekKeys]);

  const groupedMetrics = metrics?.reduce((acc: Record<string, MetricEntry[]>, curr: MetricEntry) => {
    if (!acc[curr.name]) acc[curr.name] = [];
    acc[curr.name].push(curr);
    return acc;
  }, {} as Record<string, MetricEntry[]>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text flex items-center gap-3">
            <BarChart3 className="w-6 h-6" /> Telemetry Data
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Quantitative Metric Tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary transition-all">
              <Plus className="w-4 h-4 mr-2" /> LOG DATA
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono tracking-widest uppercase">Log Data Point</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="METRIC NAME (e.g., REVENUE)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="VALUE (e.g., 5000)" type="number" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="UNIT (e.g., USD, HOURS)" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="CATEGORY" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Button onClick={handleSave} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 uppercase">TRANSMIT</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Trend Analysis — Last 12 Weeks</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card rounded-lg p-4 border border-white/5">
            <div className="text-[10px] text-green-400 uppercase tracking-widest mb-3 font-bold">Revenue ($)</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={revenueData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={axisStyle} interval={2} />
                <YAxis tick={axisStyle} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#22c55e" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-lg p-4 border border-white/5">
            <div className="text-[10px] text-primary uppercase tracking-widest mb-3 font-bold">Tasks Completed</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={tasksData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={axisStyle} interval={2} />
                <YAxis tick={axisStyle} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [v, "Completed"]} />
                <Bar dataKey="completed" fill="#00bfff" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-lg p-4 border border-white/5">
            <div className="text-[10px] text-violet-400 uppercase tracking-widest mb-3 font-bold">Habit Completion Rate (%)</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={habitData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={axisStyle} interval={2} />
                <YAxis tick={axisStyle} domain={[0, 100]} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "Completion"]} />
                <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start pb-4">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full bg-white/5" />)
        ) : !groupedMetrics || Object.keys(groupedMetrics).length === 0 ? (
          <div className="col-span-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest py-8">No telemetry data recorded.</div>
        ) : (
          (Object.entries(groupedMetrics) as [string, MetricEntry[]][]).map(([name, data]) => {
            const sorted = [...data].sort((a: MetricEntry, b: MetricEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latest = sorted[0];
            return (
              <motion.div key={name} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-5 rounded-lg relative overflow-hidden group border border-white/5 hover:border-primary/30">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-16 h-16 text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] text-primary uppercase tracking-widest mb-1">[{latest.category}]</div>
                  <h3 className="font-bold text-foreground uppercase tracking-wider mb-4">{name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-mono font-bold text-primary glow-text">{latest.value}</span>
                    {latest.unit && <span className="text-sm text-muted-foreground font-mono uppercase tracking-widest">{latest.unit}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Last Updated: {new Date(latest.date).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
