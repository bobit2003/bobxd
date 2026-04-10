import { useState } from "react";
import { 
  useListTasks, getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects, getListProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CheckCircle2, Circle, AlertCircle, Clock, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";

const priorityColors = {
  low: "text-muted-foreground",
  medium: "text-yellow-500",
  high: "text-destructive"
};

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskProjectId, setNewTaskProjectId] = useState("none");

  const { data: tasks, isLoading } = useListTasks({
    query: { queryKey: getListTasksQueryKey() }
  });

  const { data: projects } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    createTask.mutate({
      data: {
        title: newTaskTitle,
        priority: newTaskPriority as any,
        status: "todo",
        projectId: newTaskProjectId !== "none" ? parseInt(newTaskProjectId) : null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setNewTaskTitle("");
      }
    });
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    updateTask.mutate({ id, data: { status: newStatus as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    });
  };

  const filteredTasks = tasks?.filter(t => {
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  }).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    
    const pWeight = { high: 3, medium: 2, low: 1 };
    return pWeight[b.priority as keyof typeof pWeight] - pWeight[a.priority as keyof typeof pWeight];
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2 text-primary uppercase">Task Spooler</h1>
          <p className="text-muted-foreground">Action items and execution queue.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-md">
          <Button 
            variant={filterStatus === "all" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setFilterStatus("all")}
            className="text-xs uppercase tracking-wider h-8"
          >
            All
          </Button>
          <Button 
            variant={filterStatus === "todo" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setFilterStatus("todo")}
            className="text-xs uppercase tracking-wider h-8"
          >
            Pending
          </Button>
          <Button 
            variant={filterStatus === "done" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setFilterStatus("done")}
            className="text-xs uppercase tracking-wider h-8"
          >
            Done
          </Button>
        </div>
      </div>

      <Card className="p-2 border-border bg-card">
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add new task..."
            className="border-none bg-transparent focus-visible:ring-0 shadow-none font-sans"
          />
          
          <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
            <SelectTrigger className="w-[120px] h-9 border-border/50 bg-background text-xs uppercase tracking-wider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Pri</SelectItem>
              <SelectItem value="medium">Med Pri</SelectItem>
              <SelectItem value="high">High Pri</SelectItem>
            </SelectContent>
          </Select>

          <Select value={newTaskProjectId} onValueChange={setNewTaskProjectId}>
            <SelectTrigger className="w-[140px] h-9 border-border/50 bg-background text-xs uppercase tracking-wider hidden sm:flex">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Project</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" size="sm" className="h-9 px-4 shrink-0" disabled={!newTaskTitle.trim() || createTask.isPending}>
            {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredTasks?.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground uppercase tracking-widest text-sm font-bold">
            Queue Empty
          </div>
        ) : (
          filteredTasks?.map(task => {
            const project = projects?.find(p => p.id === task.projectId);
            const isDone = task.status === "done";
            
            return (
              <div 
                key={task.id} 
                className={`
                  flex items-center gap-4 p-4 rounded-md border transition-all group
                  ${isDone 
                    ? 'bg-card/50 border-border/30 opacity-60' 
                    : 'bg-card border-border hover:border-primary/30'
                  }
                `}
              >
                <button 
                  onClick={() => handleToggleStatus(task.id, task.status)}
                  className={`shrink-0 transition-colors ${isDone ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                >
                  {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0 font-sans">
                  <div className={`text-base font-medium truncate ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs uppercase tracking-wider font-mono">
                    <span className={`flex items-center gap-1 ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                      <AlertCircle className="w-3 h-3" /> {task.priority}
                    </span>
                    
                    {project && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <span className="text-border mx-1">|</span> {project.name}
                      </span>
                    )}
                    
                    {task.dueDate && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <span className="text-border mx-1">|</span> <Calendar className="w-3 h-3" /> {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
