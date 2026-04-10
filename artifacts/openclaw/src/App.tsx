import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import AiBrain from "@/pages/ai";
import Projects from "@/pages/projects";
import Tasks from "@/pages/tasks";
import Clients from "@/pages/clients";
import Automations from "@/pages/automations";
import AgentMap from "@/pages/agent-map";
import Notes from "@/pages/notes";
import Habits from "@/pages/habits";
import Goals from "@/pages/goals";
import Memories from "@/pages/memories";
import CommandLog from "@/pages/command-log";
import Metrics from "@/pages/metrics";
import Briefing from "@/pages/briefing";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/agent-map" component={AgentMap} />
          <Route path="/ai" component={AiBrain} />
          <Route path="/projects" component={Projects} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/clients" component={Clients} />
          <Route path="/automations" component={Automations} />
          <Route path="/notes" component={Notes} />
          <Route path="/habits" component={Habits} />
          <Route path="/goals" component={Goals} />
          <Route path="/memories" component={Memories} />
          <Route path="/command-log" component={CommandLog} />
          <Route path="/metrics" component={Metrics} />
          <Route path="/briefing" component={Briefing} />
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
