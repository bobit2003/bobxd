import { useState } from "react";
import { 
  useListProjects, getListProjectsQueryKey,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useListClients, getListClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, MoreVertical, Trash2, Code, LayoutTemplate, Bot, Wrench, FileQuestion, FolderKanban, Command } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format } from "date-fns";

const typeIcons: Record<string, any> = {
  website: LayoutTemplate,
  bot: Bot,
  tool: Wrench,
  automation: Code,
  other: FileQuestion
};

export default function Projects() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", type: "website", status: "active", clientId: "none" });

  const { data: projects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const { data: clients } = useListClients({
    query: { queryKey: getListClientsQueryKey() }
  });

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({
      data: {
        name: formData.name,
        description: formData.description,
        type: formData.type as any,
        status: formData.status as any,
        clientId: formData.clientId !== "none" ? parseInt(formData.clientId) : null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsCreateOpen(false);
        setFormData({ name: "", description: "", type: "website", status: "active", clientId: "none" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteProject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateProject.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
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
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Projects Matrix</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Active Directives & Developments</p>
        </div>
        
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="h-8 px-4 text-xs tracking-widest uppercase bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black gap-2 rounded-sm">
              <Plus className="w-3 h-3" /> Init Project
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-black/95 backdrop-blur-xl border-l border-white/10 w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="text-primary text-xs tracking-widest uppercase glow-text flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> New Directive
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-8 font-mono">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Identifier</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Parameters</label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Type</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger className="bg-black/50 border-white/10 rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                      <SelectItem value="website" className="text-xs">Website</SelectItem>
                      <SelectItem value="bot" className="text-xs">Bot</SelectItem>
                      <SelectItem value="tool" className="text-xs">Tool</SelectItem>
                      <SelectItem value="automation" className="text-xs">Automation</SelectItem>
                      <SelectItem value="other" className="text-xs">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Client Link</label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({...formData, clientId: v})}>
                    <SelectTrigger className="bg-black/50 border-white/10 rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                      <SelectItem value="none" className="text-xs text-primary">Internal</SelectItem>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full h-10 rounded-sm bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black uppercase tracking-widest text-xs" disabled={createProject.isPending}>
                {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Execute Initialization"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mr-2">Filter:</div>
        <div className="flex gap-1">
          <div className="px-2 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-[9px] uppercase tracking-widest cursor-pointer">All</div>
          <div className="px-2 py-1 bg-black/40 text-muted-foreground border border-white/10 rounded text-[9px] uppercase tracking-widest cursor-pointer hover:bg-white/5">Active</div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-40 glass-card rounded-lg animate-pulse" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center p-16 border border-white/5 border-dashed rounded-lg bg-black/20">
          <FolderKanban className="w-8 h-8 mx-auto mb-4 text-muted-foreground/30" />
          <div className="text-xs text-muted-foreground uppercase tracking-widest">No active directives found.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects?.map(project => {
            const Icon = typeIcons[project.type] || typeIcons.other;
            const client = clients?.find(c => c.id === project.clientId);
            const fakeProgress = Math.floor(Math.random() * 70) + 20;
            
            return (
              <div key={project.id} className="glass-card rounded-lg p-4 flex flex-col group relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  project.status === 'active' ? 'bg-green-500' :
                  project.status === 'paused' ? 'bg-amber-500' :
                  project.status === 'completed' ? 'bg-primary' : 'bg-muted-foreground'
                }`} />
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary opacity-80" />
                    <div className="text-[10px] text-primary/70 uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20">{project.type}</div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 border-white/10 backdrop-blur-xl rounded-sm">
                      <DropdownMenuItem className="text-xs font-mono cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => handleStatusChange(project.id, project.status === 'active' ? 'paused' : 'active')}>
                        {project.status === 'active' ? 'PAUSE' : 'ACTIVATE'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-mono cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => handleStatusChange(project.id, 'completed')}>COMPLETE</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-mono cursor-pointer text-destructive focus:bg-destructive/20 focus:text-destructive" onClick={() => handleDelete(project.id)}>
                        DELETE
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-bold text-foreground text-sm tracking-tight mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-muted-foreground/80 font-sans line-clamp-2 mb-4 flex-1">
                  {project.description || "No parameters specified."}
                </p>

                <div className="space-y-3 mt-auto">
                  {client && (
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground flex justify-between">
                      <span>Client</span>
                      <span className="text-foreground">{client.name}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span className="text-primary">{fakeProgress}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full -translate-x-full animate-[scanline_2s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-muted-foreground pt-3 border-t border-white/5">
                    <span>{format(new Date(project.createdAt), 'MMM dd, yyyy')}</span>
                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <button className="text-[9px] text-primary hover:underline flex items-center gap-1">
                          <Command className="w-3 h-3" /> Command Centre
                        </button>
                      </Link>
                      <span className={`flex items-center gap-1 ${project.status === 'active' ? 'text-green-400' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
