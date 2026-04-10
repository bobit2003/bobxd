import { Link, useLocation, useLocation as useWouterLocation } from "wouter";
import { Terminal, Bot, FolderKanban, CheckSquare, Users, Zap, Menu, Network, Search, Command, BookOpen, Flame, Target, Brain, ScrollText, BarChart3, Sunrise } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGlobalSearch } from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command as CommandCmd, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const navItems = [
  { href: "/", label: "Command", icon: Terminal, key: 'totalProjects' },
  { href: "/briefing", label: "Briefing", icon: Sunrise, key: '' },
  { href: "/agent-map", label: "Agent Map", icon: Network, key: 'totalConversations' },
  { href: "/ai", label: "AI Brain", icon: Bot, key: 'totalConversations' },
  { href: "/memories", label: "Memories", icon: Brain, key: '' },
  { href: "/projects", label: "Projects", icon: FolderKanban, key: 'activeProjects' },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, key: 'pendingTasks' },
  { href: "/goals", label: "Goals", icon: Target, key: '' },
  { href: "/clients", label: "Clients", icon: Users, key: 'activeClients' },
  { href: "/notes", label: "Notes", icon: BookOpen, key: '' },
  { href: "/habits", label: "Habits", icon: Flame, key: '' },
  { href: "/metrics", label: "Metrics", icon: BarChart3, key: '' },
  { href: "/automations", label: "Automations", icon: Zap, key: 'activeAutomations' },
  { href: "/command-log", label: "Command Log", icon: ScrollText, key: '' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [uptime, setUptime] = useState("00:00:00");
  const [currentTime, setCurrentTime] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: searchResults } = useGlobalSearch(
    { q: debouncedQuery }, 
    { query: { enabled: debouncedQuery.length > 1, queryKey: ['globalSearch', debouncedQuery] as any } }
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const start = Date.now();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0').slice(0, 2));
      
      const diff = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${h}:${m}:${s}`);
    }, 47);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getStatusIndicator = (key: string) => {
    if (!summary) return null;
    const val = summary[key as keyof typeof summary] as number;
    if (val > 0) {
      return <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-auto" title={`${val} active`} />;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-mono selection:bg-primary/30 selection:text-primary relative">
      {/* Top Status Bar */}
      <div className="h-[18px] bg-black border-b border-border/50 flex items-center justify-between px-3 text-[10px] text-muted-foreground z-50 uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-primary font-bold">BobXD OS v2.0.0</span>
          <span>UPTIME: {uptime}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full" /> API: OK (12ms)</span>
          <span>SYS.TIME: {currentTime}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 bg-black/80 backdrop-blur-md border-r border-border/50 transition-all duration-300 ease-in-out flex flex-col
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 md:w-[56px]'}
          ${!isMobileMenuOpen && !isSidebarCollapsed ? 'md:w-[220px]' : ''}
        `}>
          <div className="flex items-center justify-between h-14 px-4 border-b border-border/50 shrink-0">
            <div className={`flex items-center gap-2 text-primary font-bold tracking-tighter overflow-hidden transition-opacity ${(!isMobileMenuOpen && isSidebarCollapsed) ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              <Terminal className="w-5 h-5 shrink-0 glow-text" />
              <span className="glow-text">SYS.CTRL</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex hover:bg-white/5 text-muted-foreground hover:text-primary shrink-0 ml-auto" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,191,255,0.1)]' 
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent'
                      }
                      ${(!isMobileMenuOpen && isSidebarCollapsed) ? 'justify-center px-0' : ''}
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={item.label}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'glow-text' : ''}`} />
                    <span className={`text-xs tracking-widest uppercase transition-opacity ${(!isMobileMenuOpen && isSidebarCollapsed) ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto inline-block'}`}>{item.label}</span>
                    {(!isSidebarCollapsed || isMobileMenuOpen) && getStatusIndicator(item.key)}
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center h-14 px-4 border-b border-border/50 bg-black/80 backdrop-blur-md shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-primary" />
            </Button>
            <div className="ml-4 font-bold text-primary tracking-widest uppercase text-sm glow-text">BobXD OS</div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            <div className="mx-auto max-w-7xl h-full">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={cmdOpen} onOpenChange={(open) => {
        setCmdOpen(open);
        if (!open) setSearchQuery("");
      }}>
        <DialogContent className="p-0 overflow-hidden bg-black/90 backdrop-blur-xl border-primary/30 shadow-[0_0_30px_rgba(0,191,255,0.15)] max-w-2xl font-mono">
          <CommandCmd className="bg-transparent" shouldFilter={false}>
            <div className="flex items-center border-b border-border/50 px-3">
              <Terminal className="mr-2 h-4 w-4 shrink-0 text-primary animate-pulse" />
              <CommandInput 
                placeholder="Enter command or destination..." 
                className="h-12 border-0 bg-transparent text-primary placeholder:text-primary/30 font-mono focus:ring-0 text-sm" 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
            </div>
            <CommandList className="max-h-[400px]">
              {searchResults && Object.values(searchResults).some((arr: any) => arr.length > 0) ? (
                <>
                  {searchResults.projects.length > 0 && (
                    <CommandGroup heading="Projects" className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                      {searchResults.projects.map((p: any) => (
                        <CommandItem key={`p-${p.id}`} onSelect={() => { setLocation("/projects"); setCmdOpen(false); }} className="text-foreground">
                          <FolderKanban className="mr-2 h-4 w-4" /> <span>{p.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {searchResults.tasks.length > 0 && (
                    <CommandGroup heading="Tasks" className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                      {searchResults.tasks.map((t: any) => (
                        <CommandItem key={`t-${t.id}`} onSelect={() => { setLocation("/tasks"); setCmdOpen(false); }} className="text-foreground">
                          <CheckSquare className="mr-2 h-4 w-4" /> <span>{t.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {searchResults.notes.length > 0 && (
                    <CommandGroup heading="Notes" className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                      {searchResults.notes.map((n: any) => (
                        <CommandItem key={`n-${n.id}`} onSelect={() => { setLocation("/notes"); setCmdOpen(false); }} className="text-foreground">
                          <BookOpen className="mr-2 h-4 w-4" /> <span>{n.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {searchResults.clients.length > 0 && (
                    <CommandGroup heading="Clients" className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                      {searchResults.clients.map((c: any) => (
                        <CommandItem key={`c-${c.id}`} onSelect={() => { setLocation("/clients"); setCmdOpen(false); }} className="text-foreground">
                          <Users className="mr-2 h-4 w-4" /> <span>{c.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              ) : (
                <>
                  <CommandEmpty className="py-6 text-center text-sm text-primary/50 uppercase tracking-widest">No matching records.</CommandEmpty>
                  <CommandGroup heading="Navigation" className="text-muted-foreground/50 text-[10px] uppercase tracking-widest">
                    {navItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === "").map((item) => (
                      <CommandItem
                        key={item.href}
                        onSelect={() => {
                          setLocation(item.href);
                          setCmdOpen(false);
                        }}
                        className="flex items-center gap-2 cursor-pointer text-foreground data-[selected=true]:bg-primary/20 data-[selected=true]:text-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="uppercase text-xs tracking-wider">GOTO {item.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </CommandCmd>
        </DialogContent>
      </Dialog>
    </div>
  );
}
