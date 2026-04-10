import { useState } from "react";
import { 
  useListAutomations, getListAutomationsQueryKey,
  useCreateAutomation,
  useDeleteAutomation,
  useRunAutomation
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Play, Trash2, Zap, Terminal as TerminalIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Automations() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", script: "// Auto-generated wrapper\nasync function execute() {\n  console.log('Running script...');\n}\nexecute();", trigger: "manual", status: "active" });

  const { data: automations, isLoading } = useListAutomations({
    query: { queryKey: getListAutomationsQueryKey() }
  });

  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();
  const runAutomation = useRunAutomation();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createAutomation.mutate({
      data: {
        name: formData.name,
        description: formData.description,
        script: formData.script,
        trigger: formData.trigger as any,
        status: formData.status as any
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", script: "// Auto-generated wrapper\nasync function execute() {\n  console.log('Running script...');\n}\nexecute();", trigger: "manual", status: "active" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Purge sequence?")) {
      deleteAutomation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
        }
      });
    }
  };

  const handleRun = (id: number) => {
    runAutomation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Automation Engine</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Scripted Workflows & Background Tasks</p>
        </div>
        
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="h-8 px-4 text-xs tracking-widest uppercase bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500 hover:text-black gap-2 rounded-sm">
              <Plus className="w-3 h-3" /> Compile Sequence
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-black/95 backdrop-blur-xl border-l border-white/10 w-[400px] sm:w-[600px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-amber-500 text-xs tracking-widest uppercase glow-text-amber flex items-center gap-2">
                <TerminalIcon className="w-4 h-4" /> New Sequence
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-8 font-mono">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Identifier</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Trigger</label>
                  <Select value={formData.trigger} onValueChange={(v) => setFormData({...formData, trigger: v})}>
                    <SelectTrigger className="bg-black/50 border-white/10 rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                      <SelectItem value="manual" className="text-xs text-amber-500">Manual</SelectItem>
                      <SelectItem value="scheduled" className="text-xs text-primary">Scheduled (CRON)</SelectItem>
                      <SelectItem value="event" className="text-xs text-purple-400">Webhook / Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Payload (JS/Node)</label>
                <div className="rounded border border-white/10 overflow-hidden bg-black focus-within:border-amber-500/50 transition-colors">
                  <div className="flex gap-2 p-2 bg-white/5 border-b border-white/10 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <textarea 
                    required 
                    value={formData.script} 
                    onChange={(e) => setFormData({...formData, script: e.target.value})} 
                    className="w-full bg-transparent border-0 text-green-400 font-mono text-[11px] min-h-[300px] resize-y p-4 focus:ring-0 outline-none leading-relaxed" 
                    spellCheck={false}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-10 rounded-sm bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500 hover:text-black uppercase tracking-widest text-xs" disabled={createAutomation.isPending}>
                {createAutomation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deploy Sequence"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <div key={i} className="h-64 glass-card rounded-lg animate-pulse" />
          ))}
        </div>
      ) : automations?.length === 0 ? (
        <div className="text-center p-16 border border-white/5 border-dashed rounded-lg bg-black/20">
          <TerminalIcon className="w-8 h-8 mx-auto mb-4 text-muted-foreground/30" />
          <div className="text-xs text-muted-foreground uppercase tracking-widest">No sequences compiled.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {automations?.map(automation => (
            <div key={automation.id} className="glass-card rounded-lg overflow-hidden flex flex-col group border border-white/10 hover:border-amber-500/30 transition-all">
              {/* Header */}
              <div className="bg-black/60 p-3 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Zap className={`w-4 h-4 ${automation.status === 'active' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <div>
                    <h3 className="font-bold text-foreground text-sm tracking-tight font-mono">{automation.name}</h3>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      Trig: <span className="text-amber-500">{automation.trigger}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 px-2 text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black rounded-sm border border-amber-500/30"
                    onClick={() => handleRun(automation.id)}
                    disabled={runAutomation.isPending && runAutomation.variables?.id === automation.id}
                  >
                    {(runAutomation.isPending && runAutomation.variables?.id === automation.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Play className="w-3 h-3 mr-1" />
                    )}
                    Exec
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/20 hover:text-destructive rounded-sm"
                    onClick={() => handleDelete(automation.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Terminal Body */}
              <div className="bg-black p-4 text-[10px] font-mono text-green-400 overflow-x-auto border-b border-white/5 h-24 custom-scrollbar">
                <pre><code>{automation.script}</code></pre>
              </div>
              
              {/* Output Footer */}
              <div className="p-3 bg-black/40 text-[9px] font-mono flex-1">
                <div className="flex justify-between text-muted-foreground mb-2">
                  <span>&gt; LATEST_OUTPUT</span>
                  <span>{automation.lastRunAt ? format(new Date(automation.lastRunAt), 'MMM dd HH:mm:ss') : 'NEVER'}</span>
                </div>
                {automation.lastResult ? (
                  <div className="text-foreground/80 line-clamp-3 break-words whitespace-pre-wrap leading-relaxed">
                    {automation.lastResult}
                  </div>
                ) : (
                  <div className="text-muted-foreground/30 animate-pulse">Awaiting execution...</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
