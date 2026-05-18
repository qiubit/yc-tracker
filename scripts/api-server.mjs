import { createApiServer } from "../src/lib/api.mjs";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "127.0.0.1";

const server = createApiServer();

server.listen(port, host, () => {
  console.log(`YC Tracker API listening at http://${host}:${port}`);
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
