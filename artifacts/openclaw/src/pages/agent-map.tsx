import { motion } from "framer-motion";
import { Network, Server, Database, Brain, Rocket, Code2, Search, Image as ImageIcon, Zap, Layers, Users, RefreshCw } from "lucide-react";
import { useGetAgentStats, getGetAgentStatsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const nodes = [
  { id: "core", label: "BobXD OS", icon: Server, x: 50, y: 50, color: "text-primary", glow: "shadow-[0_0_20px_rgba(0,191,255,0.4)]", pulse: true, domain: null },
  { id: "ai", label: "AI Brain", icon: Brain, x: 20, y: 30, color: "text-purple-400", glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]", pulse: false, domain: "aiBrain" },
  { id: "planner", label: "Task Planner", icon: Layers, x: 10, y: 10, color: "text-purple-400", glow: "", pulse: false, domain: "operations" },
  { id: "code", label: "Code Gen", icon: Code2, x: 30, y: 10, color: "text-purple-400", glow: "", pulse: false, domain: null },
  { id: "research", label: "Research", icon: Search, x: 10, y: 50, color: "text-purple-400", glow: "", pulse: false, domain: null },
  { id: "image", label: "Image Gen", icon: ImageIcon, x: 30, y: 70, color: "text-purple-400", glow: "", pulse: false, domain: null },
  { id: "builder", label: "Project Builder", icon: Rocket, x: 80, y: 30, color: "text-primary", glow: "", pulse: false, domain: "operations" },
  { id: "db", label: "Database", icon: Database, x: 90, y: 10, color: "text-primary", glow: "", pulse: false, domain: null },
  { id: "deploy", label: "Deploy", icon: Network, x: 70, y: 10, color: "text-primary", glow: "", pulse: false, domain: null },
  { id: "client", label: "Revenue", icon: Users, x: 80, y: 70, color: "text-amber-500", glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]", pulse: false, domain: "revenue" },
  { id: "auto", label: "Automation", icon: Zap, x: 50, y: 80, color: "text-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]", pulse: false, domain: "automation" },
];

const connections = [
  { from: "core", to: "ai", type: "ai" },
  { from: "core", to: "builder", type: "data" },
  { from: "core", to: "client", type: "data" },
  { from: "core", to: "auto", type: "auto" },
  { from: "ai", to: "planner", type: "ai" },
  { from: "ai", to: "code", type: "ai" },
  { from: "ai", to: "research", type: "ai" },
  { from: "ai", to: "image", type: "ai" },
  { from: "builder", to: "db", type: "data" },
  { from: "builder", to: "deploy", type: "data" },
  { from: "auto", to: "core", type: "auto" },
];

function StatBadge({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className={`flex flex-col items-center px-2 py-1 rounded border ${color} bg-black/60`}>
      <span className="text-xs font-bold font-mono leading-none">{value}</span>
      <span className="text-[8px] uppercase tracking-widest opacity-70 leading-none mt-0.5">{label}</span>
    </div>
  );
}

type AgentStats = {
  aiBrain: { conversationCount: number; messageCount: number };
  operations: { activeTasks: number; pendingTasks: number; totalTasks: number };
  revenue: { pipelineValue: number; paidRevenue: number; hotLeads: number; totalLeads: number; activeClients: number; totalClients: number };
  automation: { totalAutomations: number; activeAutomations: number };
};

function NodeStatBadge({ nodeId, domain, stats }: { nodeId: string; domain: string | null; stats: AgentStats | undefined }) {
  if (!stats || !domain) return null;

  if (nodeId === "ai" && domain === "aiBrain") {
    return (
      <div className="flex gap-1 mt-1">
        <StatBadge value={stats.aiBrain.conversationCount} label="chats" color="border-purple-500/30 text-purple-400" />
        <StatBadge value={stats.aiBrain.messageCount} label="msgs" color="border-purple-500/30 text-purple-400" />
      </div>
    );
  }
  if (nodeId === "planner" && domain === "operations") {
    return (
      <div className="flex gap-1 mt-1">
        <StatBadge value={stats.operations.activeTasks} label="active" color="border-primary/30 text-primary" />
        <StatBadge value={stats.operations.totalTasks} label="total" color="border-primary/20 text-primary/60" />
      </div>
    );
  }
  if (nodeId === "builder" && domain === "operations") {
    return (
      <div className="flex gap-1 mt-1">
        <StatBadge value={stats.operations.pendingTasks} label="queue" color="border-primary/30 text-primary" />
      </div>
    );
  }
  if (nodeId === "client" && domain === "revenue") {
    return (
      <div className="flex gap-1 mt-1">
        <StatBadge value={`$${(stats.revenue.pipelineValue / 1000).toFixed(1)}k`} label="pipe" color="border-amber-500/30 text-amber-400" />
        <StatBadge value={stats.revenue.hotLeads} label="hot" color="border-red-500/30 text-red-400" />
      </div>
    );
  }
  if (nodeId === "auto" && domain === "automation") {
    return (
      <div className="flex gap-1 mt-1">
        <StatBadge value={stats.automation.activeAutomations} label="active" color="border-amber-500/30 text-amber-400" />
        <StatBadge value={stats.automation.totalAutomations} label="total" color="border-amber-500/20 text-amber-400/60" />
      </div>
    );
  }
  return null;
}

export default function AgentMap() {
  const { data: stats, isLoading, refetch } = useGetAgentStats({
    query: { queryKey: getGetAgentStatsQueryKey(), staleTime: 30000 }
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Agent Network</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Neural Architecture & Live Node Statistics</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/40 rounded transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} /> Sync
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 glass-card rounded-lg relative overflow-hidden bg-black/80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,191,255,0.05)_0%,transparent_50%)] pointer-events-none" />

          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, i) => {
              const fromNode = nodes.find(n => n.id === conn.from)!;
              const toNode = nodes.find(n => n.id === conn.to)!;
              const strokeColor = conn.type === "ai" ? "#8b5cf6" : conn.type === "auto" ? "#f59e0b" : "#00bfff";
              return (
                <g key={i}>
                  <line
                    x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                    stroke={strokeColor} strokeWidth="1" strokeOpacity="0.2"
                  />
                  <line
                    x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                    stroke={strokeColor} strokeWidth="2" strokeOpacity="0.8"
                    strokeDasharray="4 8"
                    className="animate-flow"
                  />
                </g>
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-10"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className={`
                w-12 h-12 rounded-full bg-black/60 border border-white/10 flex items-center justify-center
                backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:border-white/30
                ${node.glow}
              `}>
                {node.pulse && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-50" />
                )}
                <node.icon className={`w-5 h-5 ${node.color}`} />
              </div>
              <div className="px-2 py-0.5 bg-black/80 border border-white/10 rounded text-[9px] uppercase tracking-widest whitespace-nowrap text-foreground/80 group-hover:text-foreground mt-1">
                {node.label}
              </div>
              <NodeStatBadge nodeId={node.id} domain={node.domain} stats={stats} />
            </div>
          ))}
        </div>

        <div className="w-80 flex flex-col gap-4 shrink-0">
          {/* Node Statistics */}
          <div className="glass-card rounded-lg p-4">
            <h3 className="text-primary text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-4 glow-text">Node Statistics</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 bg-white/5" />)}
              </div>
            ) : stats ? (
              <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded p-3">
                  <div className="text-[9px] text-purple-400 uppercase tracking-widest mb-2 font-bold">AI Brain</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-lg font-bold font-mono text-purple-400">{stats.aiBrain.conversationCount}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Conversations</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono text-purple-400">{stats.aiBrain.messageCount}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Messages</div>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded p-3">
                  <div className="text-[9px] text-primary uppercase tracking-widest mb-2 font-bold">Operations</div>
                  <div className="grid grid-cols-3 gap-1">
                    <div>
                      <div className="text-base font-bold font-mono text-primary">{stats.operations.activeTasks}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Active</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono text-primary">{stats.operations.pendingTasks}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Pending</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono text-primary/60">{stats.operations.totalTasks}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Total</div>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                  <div className="text-[9px] text-amber-400 uppercase tracking-widest mb-2 font-bold">Revenue</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-base font-bold font-mono text-amber-400">${stats.revenue.pipelineValue.toLocaleString()}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Pipeline</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono text-green-400">${stats.revenue.paidRevenue.toLocaleString()}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Paid</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono text-red-400">{stats.revenue.hotLeads}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Hot Leads</div>
                    </div>
                    <div>
                      <div className="text-base font-bold font-mono text-foreground/60">{stats.revenue.activeClients}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Clients</div>
                    </div>
                  </div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-3">
                  <div className="text-[9px] text-cyan-400 uppercase tracking-widest mb-2 font-bold">Automation</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-lg font-bold font-mono text-cyan-400">{stats.automation.activeAutomations}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Active</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold font-mono text-cyan-400/60">{stats.automation.totalAutomations}</div>
                      <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground/40 uppercase tracking-widest text-center py-4">No data</div>
            )}
          </div>

          {/* System Status */}
          <div className="glass-card rounded-lg p-4 flex-1">
            <h3 className="text-primary text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-4 glow-text">System Status</h3>
            <div className="space-y-3">
              {[
                { label: "AI Brain", status: "nominal", color: "text-green-400", dot: "bg-green-500" },
                { label: "Ops Engine", status: "nominal", color: "text-green-400", dot: "bg-green-500" },
                { label: "Revenue Node", status: "nominal", color: "text-green-400", dot: "bg-green-500" },
                { label: "Automation", status: "nominal", color: "text-green-400", dot: "bg-green-500" },
                { label: "Database", status: "nominal", color: "text-green-400", dot: "bg-green-500" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${item.dot}`} />
                    <span className={`text-[9px] uppercase tracking-widest font-mono ${item.color}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
