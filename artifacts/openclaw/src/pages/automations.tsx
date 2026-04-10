import { useState } from "react";
import { 
  useListAutomations, getListAutomationsQueryKey,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useRunAutomation
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Play, MoreVertical, Trash2, Zap, Terminal as TerminalIcon, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function Automations() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", script: "console.log('Running task...');", trigger: "manual", status: "active" });

  const { data: automations, isLoading } = useListAutomations({
    query: { queryKey: getListAutomationsQueryKey() }
  });

  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();
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
        setFormData({ name: "", description: "", script: "console.log('Running task...');", trigger: "manual", status: "active" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteAutomation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
      }
    });
  };

  const handleRun = (id: number) => {
    runAutomation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAutomationsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2 text-primary uppercase">Automation Engine</h1>
          <p className="text-muted-foreground">Scripted workflows and background tasks.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground">
              <Plus className="w-4 h-4" /> New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-primary uppercase tracking-tighter flex items-center gap-2">
                <TerminalIcon className="w-5 h-5" /> Compile Sequence
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4 font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground tracking-tighter">Identifier</label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Sequence Name" className="bg-background font-sans" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground tracking-tighter">Trigger Event</label>
                  <Select value={formData.trigger} onValueChange={(v) => setFormData({...formData, trigger: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Execution</SelectItem>
                      <SelectItem value="scheduled">Scheduled (CRON)</SelectItem>
                      <SelectItem value="event">Webhook / Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Description</label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Operation details..." className="bg-background font-sans" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter flex justify-between">
                  <span>Script Payload (JS/Node)</span>
                </label>
                <Textarea 
                  required 
                  value={formData.script} 
                  onChange={(e) => setFormData({...formData, script: e.target.value})} 
                  className="bg-black text-green-400 font-mono min-h-[200px] border-border/50 focus-visible:ring-primary/50 resize-none p-4" 
                />
              </div>
              <Button type="submit" className="w-full font-mono uppercase tracking-widest" disabled={createAutomation.isPending}>
                {createAutomation.isPending ? "Compiling..." : "Deploy Sequence"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1,2,3].map(i => (
            <Card key={i} className="h-64 border-border bg-card/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </Card>
          ))}
        </div>
      ) : automations?.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground uppercase tracking-widest text-sm font-bold flex flex-col items-center">
          <TerminalIcon className="w-12 h-12 mb-4 opacity-20" />
          No automation sequences compiled.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {automations?.map(automation => (
            <Card key={automation.id} className="border-border/50 bg-card hover:border-primary/30 transition-colors flex flex-col h-full">
              <CardHeader className="pb-2 border-b border-border/30 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-black border border-border">
                      <Zap className={`w-5 h-5 ${automation.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight font-mono">{automation.name}</CardTitle>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-background border border-border rounded">{automation.trigger}</span>
                        {automation.status === 'inactive' && <span className="text-destructive">DISABLED</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary"
                      onClick={() => handleRun(automation.id)}
                      disabled={runAutomation.isPending && runAutomation.variables?.id === automation.id}
                    >
                      {(runAutomation.isPending && runAutomation.variables?.id === automation.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span className="uppercase text-xs tracking-widest">Run</span>
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border-border">
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(automation.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {automation.description && (
                  <div className="p-4 text-sm text-muted-foreground font-sans border-b border-border/30">
                    {automation.description}
                  </div>
                )}
                
                <div className="bg-black p-4 text-xs font-mono text-muted-foreground overflow-x-auto border-b border-border/30 max-h-32">
                  <pre><code>{automation.script}</code></pre>
                </div>
                
                <div className="p-4 mt-auto bg-card text-xs font-mono">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> 
                    LAST EXECUTION: {automation.lastRunAt ? format(new Date(automation.lastRunAt), 'PPpp') : 'NEVER'}
                  </div>
                  
                  {automation.lastResult ? (
                    <div className="bg-background border border-border p-2 rounded max-h-24 overflow-y-auto">
                      <div className="text-primary/70 mb-1">OUTPUT:</div>
                      <pre className="text-foreground whitespace-pre-wrap">{automation.lastResult}</pre>
                    </div>
                  ) : (
                    <div className="text-muted-foreground/50 italic">Waiting for telemetry...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
