import { useState } from "react";
import { 
  useListClients, getListClientsQueryKey,
  useCreateClient,
  useUpdateClient,
  useDeleteClient
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Building2, Mail, MoreVertical, Trash2, UserCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Clients() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", company: "", status: "active" });

  const { data: clients, isLoading } = useListClients({
    query: { queryKey: getListClientsQueryKey() }
  });

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
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
    deleteClient.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      }
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateClient.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter mb-2 text-primary uppercase">Client Roster</h1>
          <p className="text-muted-foreground">Entity relationships and contacts.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Entity
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-primary uppercase tracking-tighter">New Entity Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4 font-sans">
              <div className="space-y-2 font-mono">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Primary Contact</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" className="bg-background font-sans" />
              </div>
              <div className="space-y-2 font-mono">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Organization</label>
                <Input value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} placeholder="Company Name" className="bg-background font-sans" />
              </div>
              <div className="space-y-2 font-mono">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Comm Link (Email)</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email Address" className="bg-background font-sans" />
              </div>
              <div className="space-y-2 font-mono">
                <label className="text-xs uppercase text-muted-foreground tracking-tighter">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full font-mono uppercase tracking-widest" disabled={createClient.isPending}>
                {createClient.isPending ? "Processing..." : "Commit Record"}
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
      ) : clients?.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground uppercase tracking-widest text-sm font-bold">
          No records found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients?.map(client => (
            <Card key={client.id} className="border-border/50 bg-card hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                client.status === 'active' ? 'bg-green-500' :
                client.status === 'lead' ? 'bg-primary' : 'bg-muted'
              }`} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start pl-2">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-muted-foreground opacity-50" />
                    <div>
                      <CardTitle className="text-lg font-bold tracking-tight">{client.name}</CardTitle>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{client.status}</div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border-border">
                      <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'active')}>Mark Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'lead')}>Mark Lead</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(client.id, 'inactive')}>Mark Inactive</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(client.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="font-sans pl-8">
                <div className="space-y-3 mt-4">
                  {client.company && (
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {client.company}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-3 text-sm text-foreground">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors">{client.email}</a>
                    </div>
                  )}
                  {!client.company && !client.email && (
                    <div className="text-sm text-muted-foreground italic">No additional data</div>
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
