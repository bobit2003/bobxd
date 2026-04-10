import { useState } from "react";
import {
  useListContent, getListContentQueryKey,
  useCreateContent, useUpdateContent, useDeleteContent
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pen, Video, FileText as ArticleIcon, Send, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const platformColors: Record<string, string> = {
  linkedin: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  tiktok: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  x: "bg-white/10 text-white/70 border-white/20",
  instagram: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  youtube: "bg-red-500/20 text-red-400 border-red-500/30",
  blog: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const statusIcons: Record<string, any> = {
  idea: Eye,
  draft: Pen,
  scheduled: Send,
  published: Send,
  archived: ArticleIcon,
};

export default function ContentCalendar() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "", platform: "linkedin", contentType: "post", status: "idea", content: "", scheduledDate: ""
  });

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
      } as any
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
    updateContent.mutate({ id, data: updateData as any }, { onSuccess: invalidate });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this content item?")) deleteContent.mutate({ id }, { onSuccess: invalidate });
  };

  const grouped = {
    idea: items?.filter(i => i.status === "idea") || [],
    draft: items?.filter(i => i.status === "draft") || [],
    scheduled: items?.filter(i => i.status === "scheduled") || [],
    published: items?.filter(i => i.status === "published") || [],
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Content Calendar</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Content Pipeline & Publishing</p>
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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !items?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No content items</div>
      ) : (
        <div className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(["idea", "draft", "scheduled", "published"] as const).map(status => (
            <div key={status} className="space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold border-b border-white/10 pb-2">
                {status} ({grouped[status].length})
              </h3>
              {grouped[status].map(item => {
                const Icon = statusIcons[item.status] || Eye;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/10 rounded-lg p-3 hover:border-primary/30 transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${platformColors[item.platform] || "bg-white/5 text-white/50"}`}>
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
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.status !== "published" && (
                          <Select value={item.status} onValueChange={v => handleStatusChange(item.id, v)}>
                            <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent"><Icon className="w-3.5 h-3.5 text-primary" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="idea">Idea</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
