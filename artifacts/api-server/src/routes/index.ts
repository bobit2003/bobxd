import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import projectsRouter from "./projects";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import automationsRouter from "./automations";
import dashboardRouter from "./dashboard";
import notesRouter from "./notes";
import habitsRouter from "./habits";
import goalsRouter from "./goals";
import memoriesRouter from "./memories";
import auditRouter from "./audit";
import metricsRouter from "./metrics";
import searchRouter from "./search";
import briefingRouter from "./briefing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(projectsRouter);
router.use(clientsRouter);
router.use(tasksRouter);
router.use(automationsRouter);
router.use(dashboardRouter);
router.use(notesRouter);
router.use(habitsRouter);
router.use(goalsRouter);
router.use(memoriesRouter);
router.use(auditRouter);
router.use(metricsRouter);
router.use(searchRouter);
router.use(briefingRouter);

export default router;
