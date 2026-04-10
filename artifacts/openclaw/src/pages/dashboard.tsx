import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, CheckSquare, Users, Zap, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

function StatCard({ title, value, icon: Icon, subtitle, href }: { title: string, value: string | number, icon: any, subtitle?: string, href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 cursor-pointer transition-colors border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-sans">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 tracking-tighter">
              {subtitle}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter mb-2 text-primary uppercase">Command Center</h1>
        <p className="text-muted-foreground">System overview and real-time telemetry.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard 
            title="Projects" 
            value={data.totalProjects} 
            subtitle={`${data.activeProjects} active`}
            icon={FolderKanban}
            href="/projects"
          />
          <StatCard 
            title="Tasks" 
            value={data.pendingTasks} 
            subtitle={`${data.completedTasks} completed total`}
            icon={CheckSquare}
            href="/tasks"
          />
          <StatCard 
            title="Clients" 
            value={data.totalClients} 
            subtitle={`${data.activeClients} active`}
            icon={Users}
            href="/clients"
          />
          <StatCard 
            title="Automations" 
            value={data.totalAutomations} 
            subtitle={`${data.activeAutomations} active`}
            icon={Zap}
            href="/automations"
          />
          <StatCard 
            title="AI Convos" 
            value={data.totalConversations} 
            subtitle="Neural link active"
            icon={MessageSquare}
            href="/ai"
          />
        </div>
      ) : (
        <div className="text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
          Failed to load telemetry.
        </div>
      )}

      {/* Placeholder for Activity Feed */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tighter mb-4 text-primary uppercase border-b border-border/50 pb-2">System Log</h2>
        <div className="border border-border/50 rounded-lg p-6 bg-card">
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans">
            <span className="text-primary/70">{new Date().toLocaleTimeString()}</span>
            <span>SYSTEM</span>
            <span className="text-foreground">Authentication verified. Access granted.</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-sans mt-2">
            <span className="text-primary/70">{new Date().toLocaleTimeString()}</span>
            <span>DATA</span>
            <span className="text-foreground">Telemetry synced successfully.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
