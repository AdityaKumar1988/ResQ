import knexFactory from "knex";
import { config } from "./config.js";

export const db = knexFactory({
  client: "pg",
  connection: config.db.ssl
    ? { connectionString: config.db.url, ssl: { rejectUnauthorized: false } }
    : config.db.url,
  pool: { min: 2, max: 10 },
});
