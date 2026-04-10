import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import projectsRouter from "./projects";
import clientsRouter from "./clients";
import tasksRouter from "./tasks";
import automationsRouter from "./automations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(projectsRouter);
router.use(clientsRouter);
router.use(tasksRouter);
router.use(automationsRouter);
router.use(dashboardRouter);

export default router;
