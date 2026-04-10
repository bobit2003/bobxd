import { useState } from "react";
import { 
  useListProjects, getListProjectsQueryKey,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useListClients, getListClientsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, MoreVertical, Trash2, Edit2, Code, LayoutTemplate, Bot, Wrench, FileQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2 text-primary uppercase">Projects Matrix</h1>
          <p className="text-muted-foreground">Active directives and developments.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Initialize Project
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-primary uppercase tracking-tighter">New Directive</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4 font-sans">
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Identifier</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Project Name" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Parameters</label>
                <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description (Optional)" className="bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground tracking-tighter">Type</label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="bot">Bot</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="automation">Automation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase text-muted-foreground tracking-tighter">Client Link</label>
                  <Select value={formData.clientId} onValueChange={(v) => setFormData({...formData, clientId: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Internal</SelectItem>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createProject.isPending}>
                {createProject.isPending ? "Initializing..." : "Execute"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Card key={i} className="h-48 border-border bg-card/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </Card>
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
          No active directives. Initialize a project to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map(project => {
            const Icon = typeIcons[project.type] || typeIcons.other;
            const client = clients?.find(c => c.id === project.clientId);
            
            return (
              <Card key={project.id} className="border-border/50 bg-card hover:border-primary/50 transition-colors group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded bg-primary/10 text-primary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base tracking-tight font-bold">{project.name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{project.type}</div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border-border">
                        <DropdownMenuItem onClick={() => handleStatusChange(project.id, project.status === 'active' ? 'paused' : 'active')}>
                          {project.status === 'active' ? 'Pause Project' : 'Activate Project'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'completed')}>Mark Completed</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(project.id, 'archived')}>Archive</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="font-sans">
                  <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                    {project.description || "No parameters specified."}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-border/30 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        project.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                        project.status === 'paused' ? 'bg-yellow-500' :
                        project.status === 'completed' ? 'bg-primary' : 'bg-muted-foreground'
                      }`} />
                      <span className="uppercase tracking-wider">{project.status}</span>
                    </div>
                    {client && (
                      <div className="text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded">
                        {client.name}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
