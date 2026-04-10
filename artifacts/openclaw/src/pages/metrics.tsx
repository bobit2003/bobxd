import { useListMetrics, getListMetricsQueryKey, useCreateMetric } from "@workspace/api-client-react";
import { BarChart3, Plus, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Metrics() {
  const queryClient = useQueryClient();
  const { data: metrics, isLoading } = useListMetrics({
    query: { queryKey: getListMetricsQueryKey() }
  });
  const createMetric = useCreateMetric();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", value: "", unit: "", category: "general" });

  const handleSave = async () => {
    await createMetric.mutateAsync({ data: formData });
    queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() });
    setIsDialogOpen(false);
    setFormData({ name: "", value: "", unit: "", category: "general" });
  };

  // Group metrics by name
  const groupedMetrics = metrics?.reduce((acc, curr) => {
    if (!acc[curr.name]) acc[curr.name] = [];
    acc[curr.name].push(curr);
    return acc;
  }, {} as Record<string, typeof metrics>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text flex items-center gap-3">
            <BarChart3 className="w-6 h-6" /> Telemetry Data
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Quantitative Metric Tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/50 hover:bg-primary/20 hover:text-primary transition-all">
              <Plus className="w-4 h-4 mr-2" /> LOG DATA
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-primary/30 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono tracking-widest uppercase">Log Data Point</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="METRIC NAME (e.g., REVENUE)" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="VALUE (e.g., 5000)" type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="UNIT (e.g., USD, HOURS)" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Input placeholder="CATEGORY" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-black/50 border-white/10 text-primary font-mono focus-visible:ring-primary/50 uppercase" />
              <Button onClick={handleSave} className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 uppercase">TRANSMIT</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start pr-2">
        {isLoading ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-40 w-full bg-white/5" />)
        ) : !groupedMetrics || Object.keys(groupedMetrics).length === 0 ? (
          <div className="col-span-full h-full flex items-center justify-center text-sm text-muted-foreground uppercase tracking-widest">No telemetry data recorded.</div>
        ) : (
          Object.entries(groupedMetrics).map(([name, data]) => {
            const latest = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            return (
              <motion.div key={name} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 rounded-lg relative overflow-hidden group border border-white/5 hover:border-primary/30">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-16 h-16 text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] text-primary uppercase tracking-widest mb-1">[{latest.category}]</div>
                  <h3 className="font-bold text-foreground uppercase tracking-wider mb-4">{name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-mono font-bold text-primary glow-text">{latest.value}</span>
                    {latest.unit && <span className="text-sm text-muted-foreground font-mono uppercase tracking-widest">{latest.unit}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Last Updated: {new Date(latest.date).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
