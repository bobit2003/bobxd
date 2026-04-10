import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation, getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, MessageSquare, Trash2, Send, Terminal as TerminalIcon, Bot, Network, Zap, DollarSign, BarChart2, Settings, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AgentMode = "general" | "ceo" | "revenue" | "ops" | "analytics";
type ControlMode = "full_auto" | "assist" | "manual" | "money";

const AGENT_CONFIGS: Record<AgentMode, { label: string; color: string; icon: any; badge: string }> = {
  general: { label: "Multi-Agent", color: "text-primary border-primary/40 bg-primary/10", icon: Brain, badge: "OPENCLAW OS" },
  ceo: { label: "CEO Agent", color: "text-violet-400 border-violet-500/40 bg-violet-500/10", icon: Brain, badge: "MASTER STRATEGIST" },
  revenue: { label: "Revenue Agent", color: "text-amber-400 border-amber-500/40 bg-amber-500/10", icon: DollarSign, badge: "MONEY ENGINE" },
  ops: { label: "Operations", color: "text-primary border-primary/40 bg-primary/10", icon: Settings, badge: "TASK SYSTEM" },
  analytics: { label: "Analytics", color: "text-green-400 border-green-500/40 bg-green-500/10", icon: BarChart2, badge: "DATA INTELLIGENCE" },
};

const CONTROL_MODE_CONFIGS: Record<ControlMode, { label: string; color: string; description: string }> = {
  full_auto: { label: "Full Auto", color: "text-primary", description: "Agents operate proactively" },
  assist: { label: "Assist Mode", color: "text-violet-400", description: "Agents suggest, you approve" },
  manual: { label: "Manual", color: "text-muted-foreground", description: "Insights only, no actions" },
  money: { label: "Money Mode", color: "text-amber-400", description: "Revenue agent dominant" },
};

export default function AiBrain() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("general");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDailyPlanStreaming, setIsDailyPlanStreaming] = useState(false);
  const [dailyPlanContent, setDailyPlanContent] = useState("");
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>(() => {
    return (localStorage.getItem("openclaw_control_mode") as ControlMode) ?? "assist";
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMoneyMode = controlMode === "money";
  const effectiveAgent: AgentMode = isMoneyMode ? "revenue" : agentMode;

  useEffect(() => {
    if (isMoneyMode && agentMode !== "revenue") {
      setAgentMode("revenue");
    }
  }, [isMoneyMode]);

  useEffect(() => {
    localStorage.setItem("openclaw_control_mode", controlMode);
  }, [controlMode]);

  const { data: conversations, isLoading: isLoadingConversations } = useListOpenaiConversations({
    query: { queryKey: getListOpenaiConversationsQueryKey() }
  });

  const { data: activeConversation, isLoading: isLoadingConversation } = useGetOpenaiConversation(
    activeId!,
    { query: { enabled: !!activeId, queryKey: getGetOpenaiConversationQueryKey(activeId!) } }
  );

  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages, streamingMessage]);

  const handleCreate = () => {
    const agentLabel = AGENT_CONFIGS[effectiveAgent].badge;
    createConv.mutate({ data: { title: `[${agentLabel}] Link // ${new Date().getTime().toString().slice(-4)}` } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveId(data.id);
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeId === id) setActiveId(null);
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeId || isStreaming) return;
    
    const messageContent = input;
    setInput("");
    setIsStreaming(true);
    setStreamingMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const tempUserMsg = { id: Date.now(), conversationId: activeId, role: "user", content: messageContent, createdAt: new Date().toISOString() };
    
    queryClient.setQueryData(getGetOpenaiConversationQueryKey(activeId), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempUserMsg] };
    });

    try {
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent, agentMode: effectiveAgent }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setStreamingMessage(fullResponse);
                }
                if (data.done) break;
              } catch (e) {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  const handleDailyPlan = async () => {
    setIsDailyPlanStreaming(true);
    setDailyPlanContent("");
    setShowDailyPlan(true);

    try {
      const response = await fetch("/api/intelligence/daily-plan");
      if (!response.ok) throw new Error("Failed to get daily plan");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setDailyPlanContent(fullContent);
                }
                if (data.done) break;
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      setDailyPlanContent("Failed to generate daily plan. Check API connection.");
    } finally {
      setIsDailyPlanStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const agentConfig = AGENT_CONFIGS[effectiveAgent];
  const AgentIcon = agentConfig.icon;

  const primaryColor = isMoneyMode ? "amber" : "primary";
  const glowClass = isMoneyMode ? "text-amber-400" : "text-primary glow-text";
  const borderClass = isMoneyMode ? "border-amber-500/30" : "border-primary/20";

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full gap-4 relative"
    >
      {/* Sidebar */}
      <div className={`w-72 glass-card rounded-lg flex flex-col overflow-hidden shrink-0 ${isMoneyMode ? 'border border-amber-500/20' : ''}`}>
        <div className="p-3 border-b border-white/5 bg-black/40 flex justify-between items-center">
          <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${glowClass}`}>
            <TerminalIcon className="w-3 h-3" /> Neural Links
          </div>
          <Button variant="ghost" size="icon" onClick={handleCreate} disabled={createConv.isPending} className="h-6 w-6 hover:bg-primary/20 hover:text-primary">
            {createConv.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>

        {/* Control Mode */}
        <div className="p-2 border-b border-white/5 bg-black/20">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1 px-1">Control Mode</div>
          <Select value={controlMode} onValueChange={(v) => setControlMode(v as ControlMode)}>
            <SelectTrigger className={`w-full h-8 text-[10px] uppercase tracking-widest bg-black/40 border-white/10 ${isMoneyMode ? 'text-amber-400 border-amber-500/30' : ''}`}>
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
              {(Object.keys(CONTROL_MODE_CONFIGS) as ControlMode[]).map((mode) => (
                <SelectItem key={mode} value={mode} className={`text-xs ${CONTROL_MODE_CONFIGS[mode].color}`}>
                  {CONTROL_MODE_CONFIGS[mode].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isMoneyMode && (
            <div className="text-[9px] text-amber-500/70 uppercase tracking-widest mt-1 px-1">Revenue Agent Dominant</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoadingConversations ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : conversations?.map((conv) => (
            <div 
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`
                group flex items-center justify-between p-2 rounded cursor-pointer transition-all border
                ${activeId === conv.id 
                  ? (isMoneyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,191,255,0.1)]')
                  : 'bg-black/40 border-white/5 text-muted-foreground hover:bg-white/5 hover:border-white/10'}
              `}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <div className="truncate text-[11px] font-mono">{conv.title}</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 h-5 w-5 shrink-0 hover:text-destructive hover:bg-destructive/20 transition-opacity"
                onClick={(e) => handleDelete(conv.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {conversations?.length === 0 && (
            <div className="p-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground/50">No uplinks active.</div>
          )}
        </div>

        {/* Daily Plan button at bottom of sidebar */}
        <div className="p-2 border-t border-white/5 bg-black/40">
          <Button
            variant="outline"
            className={`w-full h-8 text-[10px] uppercase tracking-widest ${isMoneyMode ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10' : 'border-primary/30 text-primary hover:bg-primary/10'}`}
            onClick={handleDailyPlan}
            disabled={isDailyPlanStreaming}
          >
            {isDailyPlanStreaming ? (
              <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating...</>
            ) : (
              <><Zap className="w-3 h-3 mr-1" /> Daily Plan</>
            )}
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Daily Plan Panel */}
        {showDailyPlan && (
          <div className={`glass-card rounded-lg border ${isMoneyMode ? 'border-amber-500/30' : 'border-primary/20'} shrink-0`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <div className={`text-xs font-bold uppercase tracking-widest ${glowClass} flex items-center gap-2`}>
                <Zap className="w-3 h-3" /> DAILY STRATEGY PLAN
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={() => setShowDailyPlan(false)}>
                ✕
              </Button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar">
              {isDailyPlanStreaming && !dailyPlanContent ? (
                <div className="flex gap-1 items-center text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analyzing system state...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs font-mono text-foreground/90 leading-relaxed">
                  {dailyPlanContent}
                  {isDailyPlanStreaming && <span className={`inline-block w-1.5 h-3.5 ml-1 animate-pulse ${isMoneyMode ? 'bg-amber-400' : 'bg-primary'}`} />}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className={`flex-1 glass-card rounded-lg flex flex-col overflow-hidden relative min-h-0 ${isMoneyMode ? 'border border-amber-500/10' : ''}`}>
          {activeId ? (
            <>
              <div className="p-3 border-b border-white/5 bg-black/40 z-10 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-xs uppercase tracking-widest ${glowClass}`}>{activeConversation?.title || "Establishing connection..."}</h3>
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[9px] uppercase tracking-widest">GPT-5.2</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">ID: {activeId}</div>
                </div>

                {/* Agent selector */}
                <div className="flex gap-1 flex-wrap">
                  {(Object.keys(AGENT_CONFIGS) as AgentMode[]).map((mode) => {
                    const cfg = AGENT_CONFIGS[mode];
                    const Icon = cfg.icon;
                    const isActive = effectiveAgent === mode;
                    const disabled = isMoneyMode && mode !== "revenue";
                    return (
                      <button
                        key={mode}
                        onClick={() => !disabled && setAgentMode(mode)}
                        disabled={disabled}
                        className={`
                          flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] uppercase tracking-widest transition-all font-mono
                          ${isActive ? cfg.color : 'text-muted-foreground/50 border-white/5 hover:border-white/10 hover:text-muted-foreground'}
                          ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-sans relative z-10 custom-scrollbar" ref={scrollRef}>
                {isLoadingConversation ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : (
                  <>
                    {activeConversation?.messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                          max-w-[85%] rounded-md p-3 relative
                          ${msg.role === 'user' 
                            ? (isMoneyMode ? 'bg-amber-500/10 border border-amber-500/30 text-foreground' : 'bg-primary/10 border border-primary/30 text-foreground')
                            : 'bg-purple-900/10 border border-purple-500/20 text-foreground'}
                        `}>
                          <div className={`text-[9px] uppercase tracking-widest mb-1.5 font-mono ${msg.role === 'user' ? (isMoneyMode ? 'text-amber-400/70 text-right' : 'text-primary/70 text-right') : 'text-purple-400 glow-text-purple'}`}>
                            {msg.role === 'user' ? 'OPERATOR' : `OPENCLAW [${agentConfig.badge}]`}
                          </div>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    
                    {isStreaming && streamingMessage && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-md p-3 bg-purple-900/10 border border-purple-500/20 text-foreground">
                          <div className="text-[9px] uppercase tracking-widest mb-1.5 font-mono text-purple-400 glow-text-purple">OPENCLAW [{agentConfig.badge}]</div>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{streamingMessage}<span className="inline-block w-1.5 h-3.5 bg-purple-400 animate-pulse ml-1 align-middle" /></div>
                        </div>
                      </div>
                    )}
                    {isStreaming && !streamingMessage && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-md p-3 bg-purple-900/10 border border-purple-500/20 text-foreground flex gap-1">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    {activeConversation?.messages.length === 0 && !isStreaming && (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <AgentIcon className={`w-12 h-12 mx-auto mb-3 opacity-20 ${agentConfig.color.split(' ')[0]}`} />
                          <p className="font-mono text-[10px] uppercase tracking-widest">
                            {agentConfig.badge} active.<br/>Awaiting operator input.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-3 bg-black/60 border-t border-white/5 backdrop-blur-xl shrink-0 z-10">
                <form className="flex gap-2 items-end relative">
                  <div className={`relative flex-1 bg-black/50 border rounded overflow-hidden transition-colors ${isMoneyMode ? 'border-amber-500/20 focus-within:border-amber-500/50' : 'border-white/10 focus-within:border-primary/50'}`}>
                    <textarea 
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={`[${agentConfig.badge}] Enter command (Ctrl+Enter to execute)...`}
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none p-3 font-sans text-sm min-h-[44px] max-h-[200px] outline-none text-foreground placeholder:text-muted-foreground/50"
                      disabled={isStreaming}
                      rows={1}
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming} 
                    className={`h-11 w-11 shrink-0 p-0 border rounded ${isMoneyMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500 hover:text-black' : 'bg-primary/20 text-primary border-primary/50 hover:bg-primary hover:text-black'}`}
                  >
                    {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 bg-black/40">
              <Network className="w-16 h-16 mb-4 opacity-10 text-primary" />
              <p className="tracking-widest uppercase text-[10px] font-mono">Initialize a neural link to begin</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
