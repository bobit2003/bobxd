import { useState, useEffect } from "react";
import {
  useListContent, getListContentQueryKey,
  useCreateContent, useUpdateContent, useDeleteContent
} from "@workspace/api-client-react";
import type { ContentItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pen, Pencil, FileText as ArticleIcon, Send, Eye, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const platformColors: Record<string, string> = {
  linkedin: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  tiktok: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  x: "bg-white/10 text-white/70 border-white/20",
  instagram: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  youtube: "bg-red-500/20 text-red-400 border-red-500/30",
  blog: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const statusColors: Record<string, string> = {
  idea: "border-l-purple-500",
  draft: "border-l-amber-500",
  scheduled: "border-l-primary",
  published: "border-l-green-500",
};

const statusIcons: Record<string, React.ElementType> = {
  idea: Eye,
  draft: Pen,
  scheduled: Send,
  published: Send,
  archived: ArticleIcon,
};

const STATUSES = ["idea", "draft", "scheduled", "published"] as const;
type ContentStatus = typeof STATUSES[number];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ContentCard({
  item,
  index,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  item: ContentItem;
  index: number;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (item: ContentItem) => void;
}) {
  const Icon = statusIcons[item.status] ?? Eye;
  return (
    <Draggable draggableId={String(item.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white/[0.03] border border-l-4 ${statusColors[item.status] ?? "border-l-white/20"} border-white/10 rounded-lg p-3 hover:border-white/20 transition-all group ${snapshot.isDragging ? "shadow-[0_8px_32px_rgba(0,191,255,0.2)] rotate-[0.5deg] scale-[1.01]" : ""}`}
        >
          <div className="flex items-start gap-2">
            <div {...provided.dragHandleProps} className="mt-0.5 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-white/10 transition-colors shrink-0">
              <svg className="w-3 h-3 text-white/20 group-hover:text-white/50" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="5" cy="4" r="1.2"/><circle cx="5" cy="8" r="1.2"/><circle cx="5" cy="12" r="1.2"/>
                <circle cx="11" cy="4" r="1.2"/><circle cx="11" cy="8" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{item.title}</p>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${platformColors[item.platform] ?? "bg-white/5 text-white/50"}`}>
                  {item.platform}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                  {item.contentType}
                </span>
              </div>
              {item.scheduledDate && (
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.scheduledDate).toLocaleDateString()}</p>
              )}
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary" onClick={() => onEdit(item)}>
                <Pencil className="w-3 h-3" />
              </Button>
              {item.status !== "published" && (
                <Select value={item.status} onValueChange={v => onStatusChange(item.id, v)}>
                  <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onDelete(item.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function ContentCalendar() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", platform: "", contentType: "", status: "", content: "", scheduledDate: "" });
  const [formData, setFormData] = useState({
    title: "", platform: "linkedin", contentType: "post", status: "idea", content: "", scheduledDate: ""
  });

  useEffect(() => {
    if (editItem) {
      setEditFormData({
        title: editItem.title,
        platform: editItem.platform,
        contentType: editItem.contentType,
        status: editItem.status,
        content: editItem.content ?? "",
        scheduledDate: editItem.scheduledDate ? new Date(editItem.scheduledDate).toISOString().slice(0, 10) : "",
      });
    }
  }, [editItem]);

  const { data: items, isLoading } = useListContent();
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListContentQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createContent.mutate({
      data: {
        ...formData,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined
      } as Parameters<typeof createContent.mutate>[0]["data"]
    }, {
      onSuccess: () => {
        invalidate();
        setIsCreateOpen(false);
        setFormData({ title: "", platform: "linkedin", contentType: "post", status: "idea", content: "", scheduledDate: "" });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    const updateData: Record<string, string> = { status };
    if (status === "published") updateData.publishedDate = new Date().toISOString();
    updateContent.mutate({ id, data: updateData as Parameters<typeof updateContent.mutate>[0]["data"] }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this content item?")) deleteContent.mutate({ id }, { onSuccess: invalidate });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    updateContent.mutate({
      id: editItem.id,
      data: {
        ...editFormData,
        scheduledDate: editFormData.scheduledDate ? new Date(editFormData.scheduledDate).toISOString() : undefined,
      } as Parameters<typeof updateContent.mutate>[0]["data"]
    }, {
      onSuccess: () => { invalidate(); setEditItem(null); }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as ContentStatus;
    const itemId = parseInt(result.draggableId);
    const item = items?.find((i: ContentItem) => i.id === itemId);
    if (!item || item.status === newStatus) return;

    queryClient.setQueryData<ContentItem[]>(getListContentQueryKey(), (old) =>
      old?.map((i: ContentItem) => i.id === itemId ? { ...i, status: newStatus } : i)
    );

    const updateData: Record<string, string> = { status: newStatus };
    if (newStatus === "published") updateData.publishedDate = new Date().toISOString();
    updateContent.mutate({ id: itemId, data: updateData as Parameters<typeof updateContent.mutate>[0]["data"] }, {
      onError: () => invalidate()
    });
  };

  const grouped: Record<ContentStatus, ContentItem[]> = {
    idea: items?.filter((i: ContentItem) => i.status === "idea") ?? [],
    draft: items?.filter((i: ContentItem) => i.status === "draft") ?? [],
    scheduled: items?.filter((i: ContentItem) => i.status === "scheduled") ?? [],
    published: items?.filter((i: ContentItem) => i.status === "published") ?? [],
  };

  const monthGrid = getMonthGrid(calMonth.year, calMonth.month);
  const monthName = new Date(calMonth.year, calMonth.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const itemsByDate: Record<string, ContentItem[]> = {};
  items?.forEach((item: ContentItem) => {
    if (!item.scheduledDate) return;
    const d = new Date(item.scheduledDate);
    if (d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month) {
      const key = String(d.getDate());
      if (!itemsByDate[key]) itemsByDate[key] = [];
      itemsByDate[key].push(item);
    }
  });

  const today = new Date();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Content Calendar</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Content Pipeline & Publishing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-white/10 rounded overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors ${view === "kanban" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3 h-3" /> Kanban
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest transition-colors border-l border-white/10 ${view === "calendar" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <CalendarDays className="w-3 h-3" /> Calendar
            </button>
          </div>
          <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary"><Plus className="w-4 h-4" /> New Content</Button>
            </SheetTrigger>
            <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
              <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">New Content</SheetTitle></SheetHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-6">
                <Input placeholder="Title *" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" required />
                <Select value={formData.platform} onValueChange={v => setFormData(p => ({ ...p, platform: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="x">X (Twitter)</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.contentType} onValueChange={v => setFormData(p => ({ ...p, contentType: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Content / notes..." value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} className="bg-white/5 border-white/10 min-h-[100px]" />
                <Input type="date" value={formData.scheduledDate} onChange={e => setFormData(p => ({ ...p, scheduledDate: e.target.value }))} className="bg-white/5 border-white/10" />
                <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createContent.isPending}>
                  {createContent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Content"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : view === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map(status => (
              <div key={status} className="flex flex-col min-h-0">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/10 pb-2 mb-2 flex justify-between">
                  <span>{status}</span>
                  <span className="text-white/30">{grouped[status].length}</span>
                </h3>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2 min-h-[80px] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                    >
                      {grouped[status].map((item, index) => (
                        <ContentCard
                          key={item.id}
                          item={item}
                          index={index}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          onEdit={setEditItem}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <button
              onClick={() => setCalMonth(prev => {
                const d = new Date(prev.year, prev.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              className="p-1.5 rounded border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold uppercase tracking-widest text-primary">{monthName}</span>
            <button
              onClick={() => setCalMonth(prev => {
                const d = new Date(prev.year, prev.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              className="p-1.5 rounded border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-white/5 rounded-lg overflow-auto flex-1">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="bg-black/80 p-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                {day}
              </div>
            ))}
            {monthGrid.map((day, i) => {
              const isToday = day !== null &&
                today.getDate() === day &&
                today.getMonth() === calMonth.month &&
                today.getFullYear() === calMonth.year;
              const dayItems = day !== null ? (itemsByDate[String(day)] ?? []) : [];

              return (
                <div
                  key={i}
                  className={`bg-black/60 p-1.5 min-h-[80px] border-t border-white/5 transition-colors ${day ? "hover:bg-white/[0.03]" : "opacity-30"}`}
                >
                  {day !== null && (
                    <>
                      <div className={`text-[11px] font-mono mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-black font-bold" : "text-muted-foreground"}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map(item => (
                          <div
                            key={item.id}
                            onClick={() => setEditItem(item)}
                            className={`text-[9px] px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 ${platformColors[item.platform] ?? "bg-white/10 text-white/60"} border`}
                            title={`${item.title} — ${item.platform} ${item.contentType}`}
                          >
                            {item.title}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="text-[9px] text-muted-foreground/60 pl-1">+{dayItems.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editItem && (
        <Sheet open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
            <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">Edit Content</SheetTitle></SheetHeader>
            <form onSubmit={handleEditSave} className="mt-6 space-y-4">
              <Input placeholder="Title" value={editFormData.title} onChange={e => setEditFormData(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" />
              <Select value={editFormData.platform} onValueChange={v => setEditFormData(p => ({ ...p, platform: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["linkedin", "tiktok", "x", "instagram", "youtube", "blog"].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editFormData.contentType} onValueChange={v => setEditFormData(p => ({ ...p, contentType: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["post", "video", "article", "story", "reel", "thread"].map(ct => (
                    <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editFormData.status} onValueChange={v => setEditFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["idea", "draft", "scheduled", "published"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Content / notes..." value={editFormData.content} onChange={e => setEditFormData(p => ({ ...p, content: e.target.value }))} className="bg-white/5 border-white/10 min-h-[100px]" />
              <Input type="date" value={editFormData.scheduledDate} onChange={e => setEditFormData(p => ({ ...p, scheduledDate: e.target.value }))} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={updateContent.isPending}>
                {updateContent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      )}
    </motion.div>
  );
}
