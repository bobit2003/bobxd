import { useState, useRef, useEffect } from "react";
import { 
  useListOpenaiConversations, getListOpenaiConversationsQueryKey,
  useCreateOpenaiConversation,
  useGetOpenaiConversation, getGetOpenaiConversationQueryKey,
  useDeleteOpenaiConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, MessageSquare, Trash2, Send } from "lucide-react";
import { format } from "date-fns";

export default function AiBrain() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    createConv.mutate({ data: { title: "New Conversation" } }, {
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

    // Optimistically update UI with user message
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
                console.error("Error parsing SSE JSON:", e);
              }
            }
          }
        }
      }

      // Re-fetch conversation to get proper IDs and saved messages
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card">
          <h2 className="font-bold tracking-tight text-primary uppercase text-sm">Neural Links</h2>
          <Button variant="ghost" size="icon" onClick={handleCreate} disabled={createConv.isPending}>
            {createConv.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {isLoadingConversations ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : conversations?.map((conv) => (
            <div 
              key={conv.id}
              onClick={() => setActiveId(conv.id)}
              className={`
                group flex items-center justify-between p-3 rounded-md cursor-pointer mb-1 transition-colors
                ${activeId === conv.id ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-muted text-muted-foreground border border-transparent'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <div className="truncate text-sm font-medium">{conv.title}</div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0 hover:text-destructive transition-opacity"
                onClick={(e) => handleDelete(conv.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {conversations?.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No links established.</div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
        {activeId ? (
          <>
            <div className="p-4 border-b border-border/50 bg-card flex justify-between items-center">
              <h3 className="font-bold text-primary">{activeConversation?.title || "Connecting..."}</h3>
              <div className="text-xs text-muted-foreground">ID: {activeId}</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-sans" ref={scrollRef}>
              {isLoadingConversation ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  {activeConversation?.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[80%] rounded-lg p-4 
                        ${msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted border border-border/50'}
                      `}>
                        <div className="text-xs opacity-50 mb-1 tracking-tighter uppercase">{msg.role}</div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  
                  {isStreaming && streamingMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-4 bg-muted border border-border/50">
                        <div className="text-xs opacity-50 mb-1 tracking-tighter uppercase">assistant</div>
                        <div className="whitespace-pre-wrap">{streamingMessage}<span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" /></div>
                      </div>
                    </div>
                  )}
                  {activeConversation?.messages.length === 0 && !isStreaming && (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Neural link established. Awaiting input.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-card border-t border-border/50">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-4 items-end relative"
              >
                <div className="relative flex-1">
                  <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter command..."
                    className="pr-12 bg-background border-border/50 focus-visible:ring-primary h-12 font-sans"
                    disabled={isStreaming}
                  />
                  <div className="absolute right-3 top-3 text-xs text-muted-foreground uppercase pointer-events-none">
                    [sys.in]
                  </div>
                </div>
                <Button type="submit" disabled={!input.trim() || isStreaming} className="h-12 w-12 shrink-0 p-0">
                  {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="w-16 h-16 mb-4 opacity-10" />
            <p className="tracking-widest uppercase font-bold opacity-50">Select or create a neural link</p>
          </div>
        )}
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
      </Card>
    </div>
  );
}
