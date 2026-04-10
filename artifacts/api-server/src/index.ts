import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ── Revenue Automation Engine Scheduler ──
  // Runs daily at 8 AM Dubai time (4 AM UTC)
  const AUTOMATION_API_URL = `http://localhost:${port}/api/automation-engine/run`;

  function getNextRunMs(): number {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const targetHour = 4; // 8 AM Dubai = UTC+4
    const targetMin = 0;
    const targetMinOfDay = targetHour * 60 + targetMin;
    const nowMinOfDay = utcHour * 60 + utcMin;
    if (nowMinOfDay < targetMinOfDay) {
      return (targetMinOfDay - nowMinOfDay) * 60 * 1000 - now.getUTCMilliseconds();
    }
    return ((24 * 60 - nowMinOfDay) + targetMinOfDay) * 60 * 1000 - now.getUTCMilliseconds();
  }

  async function runAutomationEngine(): Promise<void> {
    try {
      const { fetch } = await import("node:http");
      const req = await fetch(AUTOMATION_API_URL, { method: "POST" });
      const text = await req.text();
      logger.info({ status: req.status, body: text.slice(0, 200) }, "Automation engine ran");
    } catch (err) {
      logger.error({ err }, "Automation engine run failed");
    }
  }

  let automationTimer: NodeJS.Timeout | null = null;
  function scheduleNext(): void {
    const delay = getNextRunMs();
    automationTimer = setTimeout(async () => {
      await runAutomationEngine();
      scheduleNext();
    }, delay);
    logger.info({ delayMs: delay, nextRunUtc: new Date(Date.now() + delay).toISOString() }, "Automation scheduled");
  }
  scheduleNext();
});
