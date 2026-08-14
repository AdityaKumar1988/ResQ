import "dotenv/config";

const common = {
  client: "pg",
  connection:
    process.env.DATABASE_URL ||
    "postgres://ems:ems@localhost:5432/smart_ems",
  pool: { min: 2, max: 10 },
  migrations: { directory: "./migrations", tableName: "knex_migrations" },
  seeds: { directory: "./seeds" },
};

export default {
  development: common,
  production: {
    ...common,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    },
  },
};
