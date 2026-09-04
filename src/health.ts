import { createServer } from "node:http";

/**
 * Minimal HTTP health endpoint. Only started when PORT is set — required by
 * hosts like Render/Koyeb that expect a web service to bind a port, and it
 * gives uptime pingers something to hit so free tiers don't sleep the bot.
 */
export function startHealthServer(): void {
  const port = process.env.PORT;
  if (!port) return;
  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("MaddenTradeBot is up\n");
  }).listen(Number(port), () => {
    console.log(`Health server listening on :${port}`);
  });
}
