import { Router } from "express";
import { db } from "@workspace/db";
import { projects, clients, tasks, invoices, contentItems, leads } from "@workspace/db";
import { eq, and, desc, gte, isNull } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { writeAudit } from "../audit-writer.js";

const router = Router();

// Helper to serialize dates
function serializeProject(p: typeof projects.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

function serializeClient(c: typeof clients.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
}

function serializeTask(t: typeof tasks.$inferSelect) {
  return { ...t, dueDate: t.dueDate?.toISOString() ?? null, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

function serializeInvoice(i: typeof invoices.$inferSelect) {
  return { ...i, dueDate: i.dueDate?.toISOString() ?? null, paidDate: i.paidDate?.toISOString() ?? null, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() };
}

function serializeContentItem(c: typeof contentItems.$inferSelect) {
  return { ...c, scheduledDate: c.scheduledDate?.toISOString() ?? null, publishedDate: c.publishedDate?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() };
}

function serializeLead(l: typeof leads.$inferSelect) {
  return { ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() };
}

// GET /api/projects/:id/command-center - Full project data dump
router.get("/projects/:id/command-center", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    // Get project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get client if exists
    let client = null;
    if (project.clientId) {
      const [clientRow] = await db.select().from(clients).where(eq(clients.id, project.clientId));
      client = clientRow ? serializeClient(clientRow) : null;
    }

    // Get tasks for this project
    const projectTasks = await db.select().from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.createdAt);

    // Get invoices for this project (via client)
    let projectInvoices: typeof invoices.$inferSelect[] = [];
    if (project.clientId) {
      projectInvoices = await db.select().from(invoices)
        .where(eq(invoices.clientId, project.clientId))
        .orderBy(desc(invoices.createdAt));
    }

    // Get content items - filter by project context (we'll use title/description contains project name as proxy)
    const allContentItems = await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
    const projectContentItems = allContentItems.filter(c => 
      c.title?.toLowerCase().includes(project.name.toLowerCase()) ||
      c.content?.toLowerCase().includes(project.name.toLowerCase())
    );

    // Get leads for this project's client
    let projectLeads: typeof leads.$inferSelect[] = [];
    if (project.clientId) {
      projectLeads = await db.select().from(leads)
        .where(eq(leads.clientId, project.clientId))
        .orderBy(desc(leads.createdAt));
    }

    // Calculate financial summaries
    const totalBilled = projectInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
    const totalPaid = projectInvoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
    const totalUnpaid = projectInvoices
      .filter(inv => inv.status !== "paid" && inv.status !== "cancelled")
      .reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
    const avgDealSize = projectInvoices.length > 0 ? totalBilled / projectInvoices.length : 0;

    // Revenue by month (last 6 months)
    const now = new Date();
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthRevenue = projectInvoices
        .filter(inv => inv.status === "paid" && inv.paidDate)
        .filter(inv => {
          const paidDate = new Date(inv.paidDate!);
          return paidDate >= monthStart && paidDate <= monthEnd;
        })
        .reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
      
      revenueByMonth.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short" }),
        revenue: monthRevenue
      });
    }

    // Marketing stats
    const publishedContent = projectContentItems.filter(c => c.status === "published");
    const upcomingContent = projectContentItems
      .filter(c => c.status === "scheduled" && c.scheduledDate && new Date(c.scheduledDate) > now)
      .sort((a, b) => (a.scheduledDate?.getTime() || 0) - (b.scheduledDate?.getTime() || 0));
    
    const platformCounts: Record<string, number> = {};
    publishedContent.forEach(c => {
      platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1;
    });
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";

    // Calculate total reach and engagement
    let totalReach = 0;
    let totalEngagement = 0;
    let engagementCount = 0;
    publishedContent.forEach(c => {
      if (c.engagement) {
        try {
          const eng = JSON.parse(c.engagement);
          totalReach += eng.impressions || 0;
          totalEngagement += (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0);
          engagementCount++;
        } catch {}
      }
    });
    const engagementRate = engagementCount > 0 && totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Media section - recent uploads
    const recentUploads = publishedContent
      .sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0))
      .slice(0, 9);

    const contentByPlatform: Record<string, typeof recentUploads> = {};
    publishedContent.forEach(c => {
      if (!contentByPlatform[c.platform]) {
        contentByPlatform[c.platform] = [];
      }
      contentByPlatform[c.platform].push(serializeContentItem(c));
    });

    // Days active
    const daysActive = Math.ceil((now.getTime() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    // Build response
    const response = {
      project: serializeProject(project),
      client,
      tasks: projectTasks.map(serializeTask),
      invoices: projectInvoices.map(serializeInvoice),
      financial: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalUnpaid: Math.round(totalUnpaid * 100) / 100,
        avgDealSize: Math.round(avgDealSize * 100) / 100,
        revenueByMonth
      },
      marketing: {
        contentItems: projectContentItems.map(serializeContentItem),
        upcomingPosts: upcomingContent.slice(0, 5).map(serializeContentItem),
        recentPosts: publishedContent.slice(0, 5).map(serializeContentItem),
        topPlatform,
        totalReach,
        engagementRate: Math.round(engagementRate * 100) / 100
      },
      media: {
        deliverables: [], // Placeholder for actual files
        recentUploads: recentUploads.map(serializeContentItem),
        contentByPlatform
      },
      leads: projectLeads.map(serializeLead),
      stats: {
        totalTasks: projectTasks.length,
        completedTasks: projectTasks.filter(t => t.status === "done").length,
        totalInvoices: projectInvoices.length,
        totalContent: projectContentItems.length,
        daysActive
      }
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to get project command center");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/projects/:id/suggestions - AI-powered suggestions
router.post("/projects/:id/suggestions", async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    // Get project with all context
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get related data
    let client = null;
    if (project.clientId) {
      const [clientRow] = await db.select().from(clients).where(eq(clients.id, project.clientId));
      client = clientRow;
    }

    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId));
    
    let projectInvoices: typeof invoices.$inferSelect[] = [];
    if (project.clientId) {
      projectInvoices = await db.select().from(invoices).where(eq(invoices.clientId, project.clientId));
    }

    const allContentItems = await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
    const projectContentItems = allContentItems.filter(c => 
      c.title?.toLowerCase().includes(project.name.toLowerCase()) ||
      c.content?.toLowerCase().includes(project.name.toLowerCase())
    );

    // Build context for AI
    const now = new Date();
    const totalRevenue = projectInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const pendingAmount = projectInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + parseFloat(i.amount || "0"), 0);
    const completedTasks = projectTasks.filter(t => t.status === "done").length;
    const pendingTasks = projectTasks.filter(t => t.status !== "done");
    const publishedContent = projectContentItems.filter(c => c.status === "published").length;
    const scheduledContent = projectContentItems.filter(c => c.status === "scheduled").length;

    const contextBlock = `PROJECT CONTEXT — ${project.name}
========================================

PROJECT DETAILS:
- Type: ${project.type}
- Status: ${project.status}
- Description: ${project.description || "None"}
- Created: ${project.createdAt.toLocaleDateString()}
- Client: ${client?.name || "Internal"}

FINANCIALS:
- Total Revenue Collected: $${totalRevenue.toFixed(0)}
- Pending Invoices: $${pendingAmount.toFixed(0)}
- Total Invoices: ${projectInvoices.length}
- Average Deal Size: $${projectInvoices.length > 0 ? (totalRevenue / projectInvoices.length).toFixed(0) : 0}

TASKS:
- Total Tasks: ${projectTasks.length}
- Completed: ${completedTasks}
- Pending: ${pendingTasks.length}
- High Priority: ${pendingTasks.filter(t => t.priority === "high").length}

CONTENT:
- Published: ${publishedContent}
- Scheduled: ${scheduledContent}
- Total Content Items: ${projectContentItems.length}

PENDING TASKS:
${pendingTasks.slice(0, 5).map(t => `- ${t.title} [${t.priority}]`).join("\n") || "None"}
`.trim();

    const systemPrompt = `You are an expert business strategist analyzing a specific project.
Generate actionable, specific suggestions in exactly 4 categories. Use real data from the context.

Respond with ONLY valid JSON matching this exact structure:
{
  "marketing": "string - specific content ideas, posting frequency, platform strategy, or campaign ideas",
  "financial": "string - pricing recommendations, upsell opportunities, invoice timing suggestions",
  "operations": "string - task automation ideas, team efficiency tips, milestone planning suggestions",
  "overall": ["string - top priority 1", "string - top priority 2", "string - top priority 3"],
  "confidence": number between 0-100
}

Make suggestions specific to this project type and context. No generic advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 1000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextBlock }
      ],
      response_format: { type: "json_object" }
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: {
      marketing: string;
      financial: string;
      operations: string;
      overall: string[];
      confidence: number;
    } = {
      marketing: "No suggestions available",
      financial: "No suggestions available",
      operations: "No suggestions available",
      overall: ["Review project status", "Check pending tasks", "Monitor financials"],
      confidence: 50
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      req.log.warn({ raw }, "Failed to parse AI suggestions");
    }

    writeAudit("project.suggestions", "project", {
      entityId: projectId,
      details: `AI generated suggestions for project ${project.name}`
    });

    res.json({
      marketing: parsed.marketing || "No suggestions available",
      financial: parsed.financial || "No suggestions available",
      operations: parsed.operations || "No suggestions available",
      overall: Array.isArray(parsed.overall) ? parsed.overall.slice(0, 3) : ["Review project status", "Check pending tasks", "Monitor financials"],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 70
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate project suggestions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;