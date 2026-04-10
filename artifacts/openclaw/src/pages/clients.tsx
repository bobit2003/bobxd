import { useState } from "react";
import { 
  useListClients, getListClientsQueryKey,
  useCreateClient,
  useUpdateClient,
  useDeleteClient
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Building2, Mail, Trash2, Users as UsersIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function intToHSL(hash: number) {
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", company: "", status: "active" });

  const { data: clients, isLoading } = useListClients({
    query: { queryKey: getListClientsQueryKey() }
  });

  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        status: formData.status as any
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsCreateOpen(false);
        setFormData({ name: "", email: "", company: "", status: "active" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Execute deletion of this entity?")) {
      deleteClient.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        }
      });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Client Registry</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Entity Relationships & Comms</p>
        </div>
        
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="h-8 px-4 text-xs tracking-widest uppercase bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black gap-2 rounded-sm">
              <Plus className="w-3 h-3" /> Add Entity
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-black/95 backdrop-blur-xl border-l border-white/10 w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="text-primary text-xs tracking-widest uppercase glow-text flex items-center gap-2">
                <UsersIcon className="w-4 h-4" /> New Entity Record
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-8 font-mono">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Designation</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Organization</label>
                <Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Comm Link (Email)</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-black/50 border-white/10 rounded-sm font-sans" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="bg-black/50 border-white/10 rounded-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs text-muted-foreground">Inactive</SelectItem>
                    <SelectItem value="lead" className="text-xs text-primary">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-10 rounded-sm bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black uppercase tracking-widest text-xs" disabled={createClient.isPending}>
                {createClient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit Record"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 glass-card rounded-lg overflow-hidden flex flex-col border border-white/5">
        <div className="grid grid-cols-[auto_1fr_1.5fr_2fr_auto_auto] gap-4 p-3 bg-black/60 border-b border-white/5 text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">
          <div className="w-8 flex justify-center">ID</div>
          <div>Entity</div>
          <div>Organization</div>
          <div>Comm Link</div>
          <div className="w-20">Status</div>
          <div className="w-10 text-center">CMD</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : clients?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground/50 text-[10px] uppercase tracking-widest font-mono">
              Registry Empty.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {clients?.map(client => {
                const initials = client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const color = intToHSL(hashCode(client.name));
                
                return (
                  <div key={client.id} className="grid grid-cols-[auto_1fr_1.5fr_2fr_auto_auto] gap-4 p-3 items-center hover:bg-white/5 transition-colors group">
                    <div className="w-8 flex justify-center">
                      <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold bg-black border border-white/10" style={{ color, borderColor: color }}>
                        {initials}
                      </div>
                    </div>
                    <div className="font-bold text-sm tracking-tight truncate text-foreground">{client.name}</div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs truncate">
                      {client.company && <Building2 className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{client.company || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs truncate">
                      {client.email && <Mail className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{client.email || '-'}</span>
                    </div>
                    <div className="w-20">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-widest border ${
                        client.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        client.status === 'lead' ? 'bg-primary/10 text-primary border-primary/30' :
                        'bg-white/5 text-muted-foreground border-white/10'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                    <div className="w-10 flex justify-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-7 h-7 text-muted-foreground hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
