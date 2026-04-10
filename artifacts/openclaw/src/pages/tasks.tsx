import { useState } from "react";
import {
  useListTasks, getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects, getListProjectsQueryKey,
  type Task,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, CheckCircle2, Circle, Trash2, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const priorityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  medium: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  low: { color: "text-muted-foreground", bg: "bg-white/5 border-white/10" }
};

const columns = [
  { id: "todo", title: "Pending" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Completed" }
];

export default function Tasks() {
  const queryClient = useQueryClient();
  const [newTaskValues, setNewTaskValues] = useState<Record<string, string>>({ todo: '', in_progress: '', done: '' });

  const { data: tasks, isLoading } = useListTasks({
    query: { queryKey: getListTasksQueryKey() }
  });

  const { data: projects } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = (status: string, e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskValues[status];
    if (!title?.trim()) return;
    createTask.mutate({
      data: { title, priority: "medium", status: status as "todo" | "in_progress" | "done", projectId: null }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setNewTaskValues(prev => ({ ...prev, [status]: '' }));
      }
    });
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    updateTask.mutate({ id, data: { status: newStatus as "todo" | "in_progress" | "done" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as "todo" | "in_progress" | "done";
    const taskId = parseInt(result.draggableId);
    const task = tasks?.find((t: Task) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    queryClient.setQueryData<Task[]>(getListTasksQueryKey(), (old) =>
      old?.map((t: Task) => t.id === taskId ? { ...t, status: newStatus } : t)
    );

    updateTask.mutate({ id: taskId, data: { status: newStatus } }, {
      onError: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Task Spooler</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Execution Queue & Kanban</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 snap-x">
            {columns.map(col => {
              const colTasks = tasks?.filter((t: Task) => t.status === col.id).sort((a: Task, b: Task) => {
                const p: Record<string, number> = { high: 3, medium: 2, low: 1 };
                return (p[b.priority] ?? 0) - (p[a.priority] ?? 0);
              }) || [];

              return (
                <div key={col.id} className="flex-1 min-w-[300px] max-w-[400px] flex flex-col bg-black/40 rounded-lg border border-white/5 snap-center transition-colors">
                  <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/60 rounded-t-lg">
                    <div className="text-xs font-bold uppercase tracking-widest text-primary/80">{col.title}</div>
                    <div className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground">{colTasks.length}</div>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar transition-colors min-h-[80px] rounded-b-none ${snapshot.isDraggingOver ? "bg-primary/5 border-primary/20" : ""}`}
                      >
                        {colTasks.map((task: Task, index: number) => {
                          const project = projects?.find((p: { id?: number | null }) => p.id === task.projectId);
                          const priConfig = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.low;

                          return (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`glass-card rounded p-3 group border border-white/5 hover:border-white/20 transition-all flex gap-2 ${dragSnapshot.isDragging ? "shadow-[0_8px_32px_rgba(0,191,255,0.25)] border-primary/40 rotate-[1deg] scale-[1.02]" : ""}`}
                                >
                                  <button
                                    onClick={() => handleToggleStatus(task.id, task.status)}
                                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
                                  </button>

                                  <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-sans mb-2 leading-tight ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                      {task.title}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${priConfig.bg} ${priConfig.color}`}>
                                        {task.priority} PRI
                                      </span>
                                      {project && (
                                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground px-1.5 py-0.5 bg-white/5 rounded border border-white/5 truncate max-w-[120px]">
                                          {project.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-center justify-between shrink-0">
                                    <div {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-white/10 transition-colors">
                                      <GripVertical className="w-3 h-3 text-white/30 group-hover:text-white/60" />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(task.id)}
                                      className="w-6 h-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>

                  <div className="p-2 border-t border-white/5 bg-black/60 rounded-b-lg">
                    <form onSubmit={(e) => handleCreate(col.id, e)} className="flex items-center gap-2">
                      <Plus className="w-3 h-3 text-muted-foreground ml-2 shrink-0" />
                      <input
                        value={newTaskValues[col.id] || ''}
                        onChange={(e) => setNewTaskValues(prev => ({ ...prev, [col.id]: e.target.value }))}
                        placeholder="Fast append..."
                        className="bg-transparent border-0 text-xs font-sans text-foreground placeholder:text-muted-foreground/50 focus:ring-0 flex-1 py-1.5 px-0 outline-none"
                      />
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </motion.div>
  );
}
