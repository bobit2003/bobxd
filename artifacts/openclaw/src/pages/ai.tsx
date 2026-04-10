import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation, getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, MessageSquare, Trash2, Send, Terminal as TerminalIcon, Bot, Network } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AiBrain() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("General");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    createConv.mutate({ data: { title: `Link // ${systemPrompt.toUpperCase()} // ${new Date().getTime().toString().slice(-4)}` } }, {
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
        body: JSON.stringify({ content: messageContent }),
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
                if (data.done) {
                  break;
                }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full gap-4 relative"
    >
      {/* Sidebar */}
      <div className="w-72 glass-card rounded-lg flex flex-col overflow-hidden shrink-0">
        <div className="p-3 border-b border-white/5 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest glow-text">
            <TerminalIcon className="w-3 h-3" /> Neural Links
          </div>
          <Button variant="ghost" size="icon" onClick={handleCreate} disabled={createConv.isPending} className="h-6 w-6 hover:bg-primary/20 hover:text-primary">
            {createConv.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          </Button>
        </div>
        
        <div className="p-2 border-b border-white/5 bg-black/20">
          <Select value={systemPrompt} onValueChange={setSystemPrompt}>
            <SelectTrigger className="w-full h-8 text-[10px] uppercase tracking-widest bg-black/40 border-white/10">
              <SelectValue placeholder="Protocol" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl">
              <SelectItem value="General" className="text-xs">General Protocol</SelectItem>
              <SelectItem value="Code Assistant" className="text-xs">Code Assistant</SelectItem>
              <SelectItem value="Business Strategy" className="text-xs">Business Strategy</SelectItem>
              <SelectItem value="Creative" className="text-xs">Creative Mode</SelectItem>
              <SelectItem value="Debug Mode" className="text-xs text-amber-500">Debug Mode</SelectItem>
            </SelectContent>
          </Select>
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
                ${activeId === conv.id ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,191,255,0.1)]' : 'bg-black/40 border-white/5 text-muted-foreground hover:bg-white/5 hover:border-white/10'}
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
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card rounded-lg flex flex-col overflow-hidden relative">
        {activeId ? (
          <>
            <div className="p-3 border-b border-white/5 bg-black/40 flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-primary text-xs uppercase tracking-widest">{activeConversation?.title || "Establishing connection..."}</h3>
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[9px] uppercase tracking-widest glow-text-purple">GPT-5.2</span>
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest">ID: {activeId}</div>
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
                          ? 'bg-primary/10 border border-primary/30 text-foreground' 
                          : 'bg-purple-900/10 border border-purple-500/20 text-foreground'}
                      `}>
                        <div className={`text-[9px] uppercase tracking-widest mb-1.5 font-mono ${msg.role === 'user' ? 'text-primary/70 text-right' : 'text-purple-400 glow-text-purple'}`}>
                          {msg.role === 'user' ? 'OPERATOR' : 'BobXD AI'}
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  
                  {isStreaming && streamingMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-md p-3 bg-purple-900/10 border border-purple-500/20 text-foreground">
                        <div className="text-[9px] uppercase tracking-widest mb-1.5 font-mono text-purple-400 glow-text-purple">BobXD AI</div>
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
                        <Bot className="w-12 h-12 mx-auto mb-3 opacity-20 text-primary" />
                        <p className="font-mono text-[10px] uppercase tracking-widest">Neural link established.<br/>Awaiting operator input.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-3 bg-black/60 border-t border-white/5 backdrop-blur-xl shrink-0 z-10">
              <form className="flex gap-2 items-end relative">
                <div className="relative flex-1 bg-black/50 border border-white/10 rounded overflow-hidden focus-within:border-primary/50 transition-colors">
                  <textarea 
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter command (Ctrl+Enter to execute)..."
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none p-3 font-sans text-sm min-h-[44px] max-h-[200px] outline-none text-foreground placeholder:text-muted-foreground/50"
                    disabled={isStreaming}
                    rows={1}
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming} 
                  className="h-11 w-11 shrink-0 p-0 bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black rounded"
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
    </motion.div>
  );
}
