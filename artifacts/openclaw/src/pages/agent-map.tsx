import { motion } from "framer-motion";
import { Network, Server, Database, Brain, Rocket, Code2, Search, Image as ImageIcon, Zap, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const nodes = [
  { id: 'core', label: 'BobXD OS', icon: Server, x: 50, y: 50, color: 'text-primary', glow: 'shadow-[0_0_20px_rgba(0,191,255,0.4)]', pulse: true },
  { id: 'ai', label: 'AI Brain (GPT-5.2)', icon: Brain, x: 20, y: 30, color: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.3)]', pulse: false },
  { id: 'planner', label: 'Task Planner', icon: Layers, x: 10, y: 10, color: 'text-purple-400', glow: '', pulse: false },
  { id: 'code', label: 'Code Gen (Codex)', icon: Code2, x: 30, y: 10, color: 'text-purple-400', glow: '', pulse: false },
  { id: 'research', label: 'Research Agent', icon: Search, x: 10, y: 50, color: 'text-purple-400', glow: '', pulse: false },
  { id: 'image', label: 'Image Gen', icon: ImageIcon, x: 30, y: 70, color: 'text-purple-400', glow: '', pulse: false },
  
  { id: 'builder', label: 'Project Builder', icon: Rocket, x: 80, y: 30, color: 'text-primary', glow: '', pulse: false },
  { id: 'db', label: 'Database Agent', icon: Database, x: 90, y: 10, color: 'text-primary', glow: '', pulse: false },
  { id: 'deploy', label: 'Deploy Agent', icon: Network, x: 70, y: 10, color: 'text-primary', glow: '', pulse: false },
  
  { id: 'client', label: 'Client Manager', icon: Users, x: 80, y: 70, color: 'text-primary', glow: '', pulse: false },
  { id: 'auto', label: 'Automation Engine', icon: Zap, x: 50, y: 80, color: 'text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', pulse: false },
];

const connections = [
  { from: 'core', to: 'ai', type: 'ai' },
  { from: 'core', to: 'builder', type: 'data' },
  { from: 'core', to: 'client', type: 'data' },
  { from: 'core', to: 'auto', type: 'auto' },
  { from: 'ai', to: 'planner', type: 'ai' },
  { from: 'ai', to: 'code', type: 'ai' },
  { from: 'ai', to: 'research', type: 'ai' },
  { from: 'ai', to: 'image', type: 'ai' },
  { from: 'builder', to: 'db', type: 'data' },
  { from: 'builder', to: 'deploy', type: 'data' },
  { from: 'auto', to: 'core', type: 'auto' },
];

export default function AgentMap() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-widest mb-1 text-primary uppercase glow-text">Agent Network</h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Neural Architecture & Autonomous Nodes</p>
      </div>

      <div className="mt-6 flex-1 flex gap-6 min-h-0">
        <div className="flex-1 glass-card rounded-lg relative overflow-hidden bg-black/80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,191,255,0.05)_0%,transparent_50%)] pointer-events-none" />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, i) => {
              const fromNode = nodes.find(n => n.id === conn.from)!;
              const toNode = nodes.find(n => n.id === conn.to)!;
              const strokeColor = conn.type === 'ai' ? '#8b5cf6' : conn.type === 'auto' ? '#f59e0b' : '#00bfff';
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
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 cursor-pointer group z-10`}
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
              <div className="px-2 py-0.5 bg-black/80 border border-white/10 rounded text-[9px] uppercase tracking-widest whitespace-nowrap text-foreground/80 group-hover:text-foreground">
                {node.label}
              </div>
            </div>
          ))}
        </div>

        <div className="w-80 flex flex-col gap-6 shrink-0">
          <div className="glass-card rounded-lg p-4">
            <h3 className="text-primary text-xs font-bold uppercase tracking-widest border-b border-white/10 pb-2 mb-4 glow-text">Node Diagnostics</h3>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Status</div>
                <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> All Systems Nominal
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Load</div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[34%]" />
                </div>
                <div className="text-[9px] text-right mt-1 text-primary font-mono">34%</div>
              </div>
              <Button className="w-full h-8 text-[10px] uppercase tracking-widest bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black">
                Send Task Directive
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-lg flex-1 flex flex-col min-h-0">
            <h3 className="text-primary text-xs font-bold uppercase tracking-widest border-b border-white/10 p-4 pb-2 glow-text shrink-0">Intercepted Comms</h3>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[9px] custom-scrollbar">
              <div className="border-l border-purple-500/50 pl-2">
                <div className="text-muted-foreground/50">10:42:01.300 • AI_BRAIN → CODE_GEN</div>
                <div className="text-foreground mt-0.5">Synthesize auth middleware module.</div>
              </div>
              <div className="border-l border-primary/50 pl-2">
                <div className="text-muted-foreground/50">10:41:45.102 • CORE → PROJECT_BUILDER</div>
                <div className="text-foreground mt-0.5">Initialize env variables for Client 04.</div>
              </div>
              <div className="border-l border-amber-500/50 pl-2">
                <div className="text-muted-foreground/50">10:40:02.991 • AUTO_ENGINE → CORE</div>
                <div className="text-foreground mt-0.5">Daily summary execution complete.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
