import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Loader2, Brain, TrendingUp, DollarSign, Image, FileText, CheckSquare, 
  ArrowLeft, ChevronRight, Calendar, BarChart3, Target, Lightbulb, 
  Zap, RefreshCw, Clock, CheckCircle, Circle, AlertCircle, Layers
} from "lucide-react";
import { Link } from "wouter";

interface ProjectData {
  project: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    type: string;
    clientId: number | null;
    createdAt: string;
    updatedAt: string;
  };
  client: {
    id: number;
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
    status: string;
  } | null;
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    projectId: number | null;
    clientId: number | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    title: string;
    amount: string;
    status: string;
    clientId: number | null;
    dueDate: string | null;
    paidDate: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  financial: {
    totalBilled: number;
    totalPaid: number;
    totalUnpaid: number;
    avgDealSize: number;
    revenueByMonth: Array<{ month: string; revenue: number }>;
  };
  marketing: {
    contentItems: Array<any>;
    upcomingPosts: Array<any>;
    recentPosts: Array<any>;
    topPlatform: string;
    totalReach: number;
    engagementRate: number;
  };
  media: {
    deliverables: any[];
    recentUploads: Array<any>;
    contentByPlatform: Record<string, any[]>;
  };
  leads: any[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalInvoices: number;
    totalContent: number;
    daysActive: number;
  };
}

interface AISuggestions {
  marketing: string;
  financial: string;
  operations: string;
  overall: string[];
  confidence: number;
}

type TabType = "overview" | "ai" | "marketing" | "financial" | "media" | "tasks" | "files";

function SkeletonCard() {
  return (
    <div className="glass-card rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-white/5 rounded w-1/2"></div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color = "text-primary" }: { 
  icon: any; label: string; value: string | number; subtext?: string; color?: string 
}) {
  return (
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = Number(params.id);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  
  const { data, isLoading, error } = useQuery<ProjectData>({
    queryKey: ["project-command-center", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/command-center`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const getSuggestions = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/suggestions`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to get suggestions");
      return res.json();
    },
    onSuccess: (data) => {
      setSuggestions(data);
    },
  });

  const handleGetSuggestions = () => {
    setSuggestionsLoading(true);
    getSuggestions.mutate(undefined, {
      onSettled: () => setSuggestionsLoading(false),
    });
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "ai", label: "AI Brain", icon: Brain },
    { id: "marketing", label: "Marketing", icon: TrendingUp },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "media", label: "Media", icon: Image },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "files", label: "Files", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
          <div className="h-8 w-48 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/projects">
            <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
          <span className="text-destructive">Failed to load project</span>
        </div>
      </div>
    );
  }

  const { project, client, tasks, invoices, financial, marketing, media, stats } = data;
  const maxRevenue = Math.max(...financial.revenueByMonth.map(m => m.revenue), 1);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <div className="p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-primary uppercase glow-text">{project.name}</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {project.type} • {project.status} • {stats.daysActive} days active
              {client && <> • Client: {client.name}</>}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded text-xs uppercase tracking-widest ${
          project.status === "active" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
          project.status === "completed" ? "bg-primary/20 text-primary border border-primary/30" :
          "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        }`}>
          {project.status}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-px overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? "text-primary border-b-2 border-primary bg-primary/5" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={CheckSquare} 
              label="Tasks" 
              value={`${stats.completedTasks}/${stats.totalTasks}`}
              subtext="completed"
              color="text-violet-400"
            />
            <StatCard 
              icon={DollarSign} 
              label="Revenue" 
              value={`$${financial.totalPaid.toLocaleString()}`}
              subtext={`$${financial.totalUnpaid.toLocaleString()} pending`}
              color="text-green-400"
            />
            <StatCard 
              icon={Image} 
              label="Content" 
              value={stats.totalContent}
              subtext={`${marketing.recentPosts.length} published`}
              color="text-amber-400"
            />
            <StatCard 
              icon={Clock} 
              label="Days Active" 
              value={stats.daysActive}
              subtext={`since ${new Date(project.createdAt).toLocaleDateString()}`}
              color="text-cyan-400"
            />
            
            {/* Quick Stats Row */}
            <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="glass-card rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Billed</div>
                <div className="text-lg font-bold text-foreground">${financial.totalBilled.toLocaleString()}</div>
              </div>
              <div className="glass-card rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Avg Deal Size</div>
                <div className="text-lg font-bold text-foreground">${financial.avgDealSize.toLocaleString()}</div>
              </div>
              <div className="glass-card rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Top Platform</div>
                <div className="text-lg font-bold text-foreground capitalize">{marketing.topPlatform}</div>
              </div>
              <div className="glass-card rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Engagement</div>
                <div className="text-lg font-bold text-foreground">{marketing.engagementRate.toFixed(1)}%</div>
              </div>
            </div>

            {/* Recent Tasks Preview */}
            <div className="md:col-span-2 lg:col-span-4 glass-card rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Recent Tasks</h3>
                <button onClick={() => setActiveTab("tasks")} className="text-[10px] text-primary hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    {task.status === "done" ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : task.status === "in_progress" ? (
                      <Clock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{task.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                      task.priority === "high" ? "bg-red-500/20 text-red-400" :
                      task.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                      "bg-muted/20 text-muted-foreground"
                    }`}>{task.priority}</span>
                  </div>
                ))}
                {tasks.length === 0 && <div className="text-xs text-muted-foreground">No tasks yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* AI Brain Tab */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">AI Insights for this Project</span>
              </div>
              <button
                onClick={handleGetSuggestions}
                disabled={suggestionsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors"
              >
                {suggestionsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Get Fresh Suggestions
              </button>
            </div>

            {suggestions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card rounded-lg p-5 border-l-4 border-l-violet-400">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <span className="text-xs uppercase tracking-widest text-violet-400">Marketing</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{suggestions.marketing}</p>
                </div>

                <div className="glass-card rounded-lg p-5 border-l-4 border-l-green-400">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-xs uppercase tracking-widest text-green-400">Financial</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{suggestions.financial}</p>
                </div>

                <div className="glass-card rounded-lg p-5 border-l-4 border-l-amber-400">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase tracking-widest text-amber-400">Operations</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{suggestions.operations}</p>
                </div>

                <div className="glass-card rounded-lg p-5 border-l-4 border-l-cyan-400">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs uppercase tracking-widest text-cyan-400">Top 3 Priorities (30 days)</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">Confidence: {suggestions.confidence}%</span>
                  </div>
                  <ul className="space-y-2">
                    {suggestions.overall.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                        <span className="text-cyan-400 font-bold">{i + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-lg p-12 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Click "Get Fresh Suggestions" to generate AI-powered insights for this project</p>
              </div>
            )}
          </div>
        )}

        {/* Marketing Tab */}
        {activeTab === "marketing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={TrendingUp} label="Total Reach" value={marketing.totalReach.toLocaleString()} color="text-violet-400" />
              <StatCard icon={Target} label="Engagement Rate" value={`${marketing.engagementRate.toFixed(1)}%`} color="text-green-400" />
              <StatCard icon={BarChart3} label="Top Platform" value={marketing.topPlatform} color="text-amber-400" subtext="most active" />
            </div>

            {/* Upcoming Posts */}
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming Posts</h3>
              </div>
              {marketing.upcomingPosts.length > 0 ? (
                <div className="space-y-2">
                  {marketing.upcomingPosts.map(post => (
                    <div key={post.id} className="flex items-center gap-3 p-2 rounded bg-black/20">
                      <div className="w-16 text-[10px] text-muted-foreground">
                        {post.scheduledDate ? new Date(post.scheduledDate).toLocaleDateString() : "TBD"}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-foreground">{post.title}</div>
                        <div className="text-[9px] text-muted-foreground capitalize">{post.platform} • {post.contentType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No upcoming posts scheduled</p>
              )}
            </div>

            {/* Recent Posts */}
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-4 h-4 text-primary" />
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Recent Posts</h3>
              </div>
              {marketing.recentPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketing.recentPosts.map(post => (
                    <div key={post.id} className="p-3 rounded bg-black/20">
                      <div className="text-xs text-foreground mb-1 line-clamp-2">{post.title}</div>
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span className="capitalize">{post.platform}</span>
                        <span>{post.publishedDate ? new Date(post.publishedDate).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No published content yet</p>
              )}
            </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Total Billed" value={`$${financial.totalBilled.toLocaleString()}`} color="text-violet-400" />
              <StatCard icon={CheckCircle} label="Total Paid" value={`$${financial.totalPaid.toLocaleString()}`} color="text-green-400" />
              <StatCard icon={AlertCircle} label="Unpaid" value={`$${financial.totalUnpaid.toLocaleString()}`} color="text-amber-400" subtext={`${invoices.filter(i => i.status !== "paid" && i.status !== "cancelled").length} invoices`" />
            </div>

            {/* Revenue Chart */}
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Revenue by Month (Last 6 Months)</h3>
              </div>
              <div className="flex items-end gap-2 h-40">
                {financial.revenueByMonth.map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/20 rounded-t relative" style={{ height: `${(month.revenue / maxRevenue) * 120}px` }}>
                      <div className="absolute bottom-0 w-full bg-primary rounded-t transition-all duration-500" style={{ height: `${month.revenue > 0 ? 100 : 0}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{month.month}</span>
                    <span className="text-[9px] text-foreground">${month.revenue > 0 ? month.revenue.toLocaleString() : "-"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice List */}
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Invoices</h3>
              </div>
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.slice(0, 10).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded bg-black/20">
                      <div>
                        <div className="text-xs text-foreground">{inv.invoiceNumber}</div>
                        <div className="text-[9px] text-muted-foreground">{inv.title || "No title"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">${parseFloat(inv.amount).toLocaleString()}</div>
                        <div className={`text-[9px] px-1.5 py-0.5 rounded ${
                          inv.status === "paid" ? "bg-green-500/20 text-green-400" :
                          inv.status === "sent" ? "bg-amber-500/20 text-amber-400" :
                          "bg-muted/20 text-muted-foreground"
                        }`}>{inv.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No invoices yet</p>
              )}
            </div>
          </div>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          <div className="space-y-6">
            <div className="glass-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Recent Content</h3>
                </div>
                <button className="text-[10px] text-primary hover:underline">Upload (Coming Soon)</button>
              </div>
              {media.recentUploads.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.recentUploads.map(item => (
                    <div key={item.id} className="aspect-video rounded bg-black/40 flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No content media yet</p>
                </div>
              )}
            </div>

            {/* Platform Breakdown */}
            {Object.keys(media.contentByPlatform).length > 0 && (
              <div className="glass-card rounded-lg p-4">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Content by Platform</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(media.contentByPlatform).map(([platform, items]) => (
                    <span key={platform} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded text-xs capitalize">
                      {platform} ({items.length})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={CheckCircle} label="Completed" value={stats.completedTasks} color="text-green-400" />
              <StatCard icon={Clock} label="In Progress" value={tasks.filter(t => t.status === "in_progress").length} color="text-amber-400" />
              <StatCard icon={Circle} label="Todo" value={tasks.filter(t => t.status === "todo").length} color="text-muted-foreground" />
            </div>

            {/* Kanban View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["todo", "in_progress", "done"].map(status => {
                const statusTasks = tasks.filter(t => t.status === status);
                const statusLabel = status === "in_progress" ? "In Progress" : status === "todo" ? "Todo" : "Done";
                const statusColor = status === "done" ? "text-green-400" : status === "in_progress" ? "text-amber-400" : "text-muted-foreground";
                
                return (
                  <div key={status} className="glass-card rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`w-2 h-2 rounded-full ${status === "done" ? "bg-green-400" : status === "in_progress" ? "bg-amber-400" : "bg-muted-foreground"}`} />
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{statusLabel}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{statusTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {statusTasks.map(task => (
                        <div key={task.id} className="p-2 rounded bg-black/20 text-xs">
                          <div className="text-foreground mb-1">{task.title}</div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[9px] px-1 py-0.5 rounded ${
                              task.priority === "high" ? "bg-red-500/20 text-red-400" :
                              task.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                              "bg-muted/20 text-muted-foreground"
                            }`}>{task.priority}</span>
                            {task.dueDate && (
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {statusTasks.length === 0 && (
                        <div className="text-[9px] text-muted-foreground text-center py-4">No tasks</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="glass-card rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-2">Project Documents & Assets</p>
            <p className="text-xs text-muted-foreground">File upload coming soon</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}