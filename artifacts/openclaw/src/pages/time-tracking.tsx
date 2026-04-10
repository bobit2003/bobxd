import { useState, useEffect, useRef, useCallback } from "react";
import {
  useListTimeEntries, getListTimeEntriesQueryKey,
  useCreateTimeEntry, useDeleteTimeEntry,
  useListProjects, useListTasks
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Clock, Timer, Play, Square } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

function LiveTimer({ onStop }: { onStop: (hours: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 100);
    return () => clearInterval(interval);
  }, []);

  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-4">
      <div className="font-mono text-3xl font-bold text-red-400 tabular-nums animate-pulse">
        {pad(hrs)}:{pad(mins)}:{pad(secs)}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        onClick={() => onStop(elapsed / 3600)}
      >
        <Square className="w-3 h-3 fill-current" /> Stop
      </Button>
    </div>
  );
}

export default function TimeTracking() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDesc, setTimerDesc] = useState("");
  const [timerBillable, setTimerBillable] = useState("true");
  const [formData, setFormData] = useState({
    hours: "", description: "", billable: "true", date: new Date().toISOString().slice(0, 10)
  });

  const { data: entries, isLoading } = useListTimeEntries();
  const { data: projects } = useListProjects();
  const { data: tasks } = useListTasks();
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createEntry.mutate({ data: { ...formData, date: new Date(formData.date).toISOString() } as any }, {
      onSuccess: () => { invalidate(); setIsCreateOpen(false); setFormData({ hours: "", description: "", billable: "true", date: new Date().toISOString().slice(0, 10) }); }
    });
  };

  const handleTimerStop = useCallback((hours: number) => {
    const roundedHours = (Math.round(hours * 4) / 4).toFixed(2);
    createEntry.mutate({ data: {
      hours: roundedHours,
      description: timerDesc || "Timer session",
      billable: timerBillable,
      date: new Date().toISOString(),
    } as any }, {
      onSuccess: () => { invalidate(); setTimerRunning(false); setTimerDesc(""); }
    });
  }, [timerDesc, timerBillable]);

  const handleDelete = (id: number) => {
    if (confirm("Delete this time entry?")) deleteEntry.mutate({ id }, { onSuccess: invalidate });
  };

  const totalHours = entries?.reduce((s, e) => s + parseFloat(e.hours || "0"), 0) || 0;
  const billableHours = entries?.filter(e => e.billable === "true").reduce((s, e) => s + parseFloat(e.hours || "0"), 0) || 0;

  const projectName = (pid: number | null | undefined) => projects?.find(p => p.id === pid)?.name;
  const taskTitle = (tid: number | null | undefined) => tasks?.find(t => t.id === tid)?.title;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Time Tracker</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Hours Logged & Billable Time</p>
        </div>
        <div className="flex gap-2">
          {!timerRunning && (
            <Button className="gap-2 bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 text-green-400" onClick={() => setTimerRunning(true)}>
              <Play className="w-4 h-4 fill-current" /> Start Timer
            </Button>
          )}
          <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary"><Plus className="w-4 h-4" /> Log Time</Button>
            </SheetTrigger>
            <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
              <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">Log Time</SheetTitle></SheetHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-6">
                <Input placeholder="Hours *" type="number" step="0.25" value={formData.hours} onChange={e => setFormData(p => ({ ...p, hours: e.target.value }))} className="bg-white/5 border-white/10" required />
                <Input placeholder="Description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10" />
                <Select value={formData.billable} onValueChange={v => setFormData(p => ({ ...p, billable: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Billable</SelectItem>
                    <SelectItem value="false">Non-billable</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10" />
                <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createEntry.isPending}>
                  {createEntry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Time"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {timerRunning && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <Input placeholder="What are you working on?" value={timerDesc} onChange={e => setTimerDesc(e.target.value)}
              className="bg-transparent border-none text-sm text-white placeholder:text-white/30 max-w-xs focus-visible:ring-0" />
            <Select value={timerBillable} onValueChange={setTimerBillable}>
              <SelectTrigger className="bg-transparent border-white/10 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Billable</SelectItem>
                <SelectItem value="false">Non-billable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LiveTimer onStop={handleTimerStop} />
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary/70">Total Hours</p>
          <p className="text-2xl font-bold text-primary font-mono">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-widest text-green-400/70">Billable</p>
          <p className="text-2xl font-bold text-green-400 font-mono">{billableHours.toFixed(1)}h</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !entries?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No time entries</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {entries.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-lg p-3 hover:border-primary/30 transition-all group flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className={`w-4 h-4 ${entry.billable === "true" ? "text-green-400" : "text-white/30"}`} />
                <div>
                  <p className="text-sm text-white">{entry.description || "Untitled session"}</p>
                  <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                    {entry.billable === "true" ? <span className="text-green-400">billable</span> : <span className="text-white/30">non-billable</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-primary">{parseFloat(entry.hours || "0").toFixed(1)}h</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(entry.id)}>
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
