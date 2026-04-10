import { useState } from "react";
import {
  useListLeads, getListLeadsQueryKey,
  useCreateLead, useUpdateLead, useDeleteLead, useConvertLead
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Target, ArrowRight, Phone, Mail } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

const scoreColors: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const stageLabels: Record<string, string> = {
  new: "NEW",
  contacted: "CONTACTED",
  qualified: "QUALIFIED",
  proposal: "PROPOSAL",
  negotiation: "NEGOTIATION",
  won: "WON",
  lost: "LOST",
};

export default function Leads() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", company: "", phone: "", budget: "",
    service: "", source: "website", score: "warm", stage: "new", notes: ""
  });

  const { data: leads, isLoading } = useListLeads();
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({ data: formData as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        setIsCreateOpen(false);
        setFormData({ name: "", email: "", company: "", phone: "", budget: "", service: "", source: "website", score: "warm", stage: "new", notes: "" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this lead?")) {
      deleteLead.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() })
      });
    }
  };

  const handleConvert = (id: number) => {
    if (confirm("Convert this lead to a client + project?")) {
      convertLead.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() })
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Lead Pipeline</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Prospect Tracking & Conversion</p>
        </div>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2 bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary">
              <Plus className="w-4 h-4" /> New Lead
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-[#0d0d0d] border-white/10 overflow-y-auto">
            <SheetHeader><SheetTitle className="text-primary tracking-widest uppercase">Add Lead</SheetTitle></SheetHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-6">
              <Input placeholder="Name *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10" required />
              <Input placeholder="Email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Company" value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Budget" value={formData.budget} onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input placeholder="Service" value={formData.service} onChange={e => setFormData(p => ({ ...p, service: e.target.value }))} className="bg-white/5 border-white/10" />
              <Select value={formData.source} onValueChange={v => setFormData(p => ({ ...p, source: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="cold_email">Cold Email</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={formData.score} onValueChange={v => setFormData(p => ({ ...p, score: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Notes" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} className="bg-white/5 border-white/10" />
              <Button type="submit" className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30" disabled={createLead.isPending}>
                {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Lead"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !leads?.length ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">No leads in pipeline</div>
      ) : (
        <div className="flex-1 overflow-auto space-y-3">
          {leads.map((lead, i) => (
            <motion.div key={lead.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white/[0.03] border border-white/10 rounded-lg p-4 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white truncate">{lead.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${scoreColors[lead.score] || "bg-white/10 text-white/60"}`}>
                      {lead.score?.toUpperCase()}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 font-mono">
                      {stageLabels[lead.stage] || lead.stage}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {lead.company && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{lead.company}</span>}
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                    {lead.budget && <span className="text-green-400">${lead.budget}</span>}
                    {lead.service && <span className="text-violet-400">{lead.service}</span>}
                  </div>
                  {lead.notes && <p className="text-xs text-white/40 mt-2 line-clamp-1">{lead.notes}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {lead.stage !== "won" && lead.stage !== "lost" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => handleConvert(lead.id)}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDelete(lead.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
