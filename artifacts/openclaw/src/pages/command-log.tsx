import { useListAuditLog, getListAuditLogQueryKey } from "@workspace/api-client-react";
import { ScrollText, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function CommandLog() {
  const { data: logs, isLoading } = useListAuditLog({
    query: { queryKey: getListAuditLogQueryKey() }
  });

  const [filter, setFilter] = useState("");

  const filteredLogs = logs?.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.entity.toLowerCase().includes(filter.toLowerCase()) ||
    log.source.toLowerCase().includes(filter.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(filter.toLowerCase()))
  ) || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text flex items-center gap-3">
          <ScrollText className="w-6 h-6" /> System Audit Log
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Immutable Action History</p>
      </div>

      <div className="shrink-0">
        <Input 
          placeholder="FILTER LOGS (ACTION, ENTITY, SOURCE)..." 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/50 border-white/10 text-primary font-mono tracking-widest uppercase focus-visible:ring-primary/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 glass-card rounded-lg p-4 font-mono text-xs">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-6 w-full bg-white/5" />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">No logs match criteria.</div>
        ) : (
          <div className="space-y-1">
            <div className="flex gap-4 text-muted-foreground/50 border-b border-white/10 pb-2 mb-2 uppercase tracking-widest">
              <span className="w-40 shrink-0">TIMESTAMP</span>
              <span className="w-24 shrink-0">SOURCE</span>
              <span className="w-32 shrink-0">ACTION</span>
              <span className="w-24 shrink-0">ENTITY</span>
              <span className="flex-1">DETAILS</span>
            </div>
            {filteredLogs.map(log => (
              <div key={log.id} className="flex gap-4 py-1.5 hover:bg-white/5 rounded px-2 transition-colors group">
                <span className="w-40 shrink-0 text-primary/60">{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                <span className={`w-24 shrink-0 ${log.source === 'system' ? 'text-amber-500' : log.source === 'ai' ? 'text-purple-500' : 'text-primary'}`}>[{log.source}]</span>
                <span className="w-32 shrink-0 text-foreground/80">{log.action}</span>
                <span className="w-24 shrink-0 text-muted-foreground">{log.entity}</span>
                <span className="flex-1 text-muted-foreground truncate group-hover:text-foreground transition-colors">{log.details || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
