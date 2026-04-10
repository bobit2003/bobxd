import { useListNotes, getListNotesQueryKey, useCreateNote, useDeleteNote, useUpdateNote } from "@workspace/api-client-react";
import { BookOpen, Plus, Trash2, Edit2, Pin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Notes() {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useListNotes({
    query: { queryKey: getListNotesQueryKey() }
  });
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({ title: "", content: "", category: "", tags: "" });

  const filteredNotes = notes?.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.category.toLowerCase().includes(search.toLowerCase()) ||
    (n.tags && n.tags.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    if (a.pinned === "true" && b.pinned !== "true") return -1;
    if (a.pinned !== "true" && b.pinned === "true") return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }) || [];

  const handleSave = async () => {
    if (editingId) {
      await updateNote.mutateAsync({ id: editingId, data: formData });
    } else {
      await createNote.mutateAsync({ data: formData });
    }
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    setIsDialogOpen(false);
    setFormData({ title: "", content: "", category: "", tags: "" });
    setEditingId(null);
  };

  const handleEdit = (note: any) => {
    setFormData({ title: note.title, content: note.content, category: note.category, tags: note.tags || "" });
    setEditingId(note.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteNote.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
  };

  const togglePin = async (note: any) => {
    await updateNote.mutateAsync({ id: note.id, data: { pinned: note.pinned === "true" ? "false" : "true" } });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Knowledge Base</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Neural Information Storage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setFormData({ title: "", content: "", category: "", tags: "" });
            setEditingId(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary transition-all">
              <Plus className="w-4 h-4 mr-2" /> NEW ENTRY
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono tracking-widest uppercase">{editingId ? 'Edit Entry' : 'New Entry'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="TITLE" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50" />
              <Input placeholder="CATEGORY" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50" />
              <Input placeholder="TAGS (comma separated)" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50" />
              <Textarea placeholder="CONTENT..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="h-32 bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50" />
              <Button onClick={handleSave} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50">SAVE ENTRY</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="shrink-0 relative">
        <Input 
          placeholder="SEARCH DATABANKS..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black/50 border-white/10 text-primary font-mono tracking-widest uppercase focus-visible:ring-primary/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full bg-white/5" />)}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">No entries found.</div>
        ) : (
          filteredNotes.map(note => (
            <motion.div key={note.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 rounded-lg group relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {note.pinned === "true" && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                  <h3 className="font-bold text-primary uppercase tracking-wider">{note.title}</h3>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => togglePin(note)}>
                    <Pin className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-amber-500" onClick={() => handleEdit(note)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 mb-3 text-[10px] text-muted-foreground uppercase tracking-widest">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{note.category}</span>
                {note.tags && note.tags.split(',').map((t: string) => (
                  <span key={t} className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{t.trim()}</span>
                ))}
              </div>
              <p className="text-xs text-foreground/80 font-mono whitespace-pre-wrap">{note.content}</p>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
