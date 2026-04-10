import { useListMemories, getListMemoriesQueryKey, useCreateMemory, useDeleteMemory } from "@workspace/api-client-react";
import { Brain, Plus, Trash2, Database } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Memories() {
  const queryClient = useQueryClient();
  const { data: memories, isLoading } = useListMemories({
    query: { queryKey: getListMemoriesQueryKey() }
  });
  const createMemory = useCreateMemory();
  const deleteMemory = useDeleteMemory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ content: "", category: "core", importance: "medium", source: "manual" });

  const handleSave = async () => {
    await createMemory.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
    setIsDialogOpen(false);
    setFormData({ content: "", category: "core", importance: "medium", source: "manual" });
  };

  const handleDelete = async (id: number) => {
    await deleteMemory.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-purple-500 uppercase glow-text-purple flex items-center gap-3">
            <Brain className="w-6 h-6" /> AI Memory Bank
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Persistent Context Storage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-400 transition-all text-purple-500">
              <Plus className="w-4 h-4 mr-2" /> INJECT CONTEXT
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-purple-500/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-purple-500 font-mono tracking-widest uppercase">Inject Memory Context</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="CATEGORY (e.g., preferences, facts)" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-black/50 border-white/10 text-purple-400 font-mono focus-visible:ring-purple-500/50 uppercase" />
              <Input placeholder="IMPORTANCE (low, medium, high)" value={formData.importance} onChange={e => setFormData({...formData, importance: e.target.value})} className="bg-black/50 border-white/10 text-purple-400 font-mono focus-visible:ring-purple-500/50 uppercase" />
              <Textarea placeholder="MEMORY CONTENT..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="h-24 bg-black/50 border-white/10 text-purple-400 font-mono focus-visible:ring-purple-500/50" />
              <Button onClick={handleSave} className="w-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 border border-purple-500/50 uppercase">STORE IN MATRIX</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full bg-white/5" />)
        ) : memories?.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">Memory bank empty.</div>
        ) : (
          memories?.map(memory => (
            <motion.div key={memory.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 rounded border border-purple-500/10 hover:border-purple-500/30 group relative">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <Database className="w-4 h-4 text-purple-500 mt-1 shrink-0 opacity-50" />
                  <div>
                    <div className="flex gap-2 mb-1 text-[9px] uppercase tracking-widest font-bold">
                      <span className="text-purple-400">[{memory.category}]</span>
                      <span className="text-muted-foreground">PRIORITY:{memory.importance}</span>
                      <span className="text-muted-foreground">SRC:{memory.source}</span>
                    </div>
                    <p className="text-sm font-mono text-foreground/90">{memory.content}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => handleDelete(memory.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
