import http from "node:http";
import { createApp } from "./app.js";
import { initSocket } from "./socket.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  logger.info(`Smart EMS API listening on :${config.port} [${config.env}]`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
