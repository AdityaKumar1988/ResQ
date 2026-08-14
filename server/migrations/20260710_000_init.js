/**
 * Initial schema for Smart EMS.
 * Uses uuid PKs, timestamps, and enum-like text with CHECK constraints for portability.
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable("users", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("email").notNullable().unique();
    t.string("password_hash").notNullable();
    t.string("name").notNullable();
    t.string("phone");
    t.string("role")
      .notNullable()
      .defaultTo("citizen")
      .checkIn(["citizen", "dispatcher", "driver", "admin"]);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("vehicles", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("plate").notNullable().unique();
    t.string("model").notNullable();
    t.string("type").notNullable().checkIn(["ALS", "BLS", "ICU", "MICU"]);
    t.string("status")
      .notNullable()
      .defaultTo("available")
      .checkIn([
        "available",
        "en_route",
        "busy",
        "at_hospital",
        "offline",
        "maintenance",
      ]);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("drivers", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.uuid("vehicle_id").references("id").inTable("vehicles").onDelete("SET NULL");
    t.string("call_sign").notNullable().unique();
    t.decimal("rating", 3, 2).defaultTo(4.7);
    t.integer("missions_completed").defaultTo(0);
    t.integer("missions_active").defaultTo(0);
    t.integer("avg_response_sec").defaultTo(480);
    t.string("status").notNullable().defaultTo("available");
    t.decimal("location_lat", 10, 6);
    t.decimal("location_lng", 10, 6);
    t.decimal("heading", 6, 2).defaultTo(0);
    t.timestamp("last_ping_at");
    t.timestamps(true, true);
  });

  await knex.schema.createTable("driver_locations", (t) => {
    t.bigIncrements("id");
    t.uuid("driver_id").references("id").inTable("drivers").onDelete("CASCADE");
    t.decimal("lat", 10, 6).notNullable();
    t.decimal("lng", 10, 6).notNullable();
    t.decimal("heading", 6, 2).defaultTo(0);
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["driver_id", "created_at"]);
  });

  await knex.schema.createTable("hospitals", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("name").notNullable();
    t.decimal("lat", 10, 6).notNullable();
    t.decimal("lng", 10, 6).notNullable();
    t.integer("beds").defaultTo(0);
    t.integer("beds_available").defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("incidents", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.string("code").notNullable().unique();
    t.string("priority").notNullable().checkIn(["P1", "P2", "P3", "P4"]);
    t.string("type").notNullable();
    t.string("status")
      .notNullable()
      .defaultTo("reported")
      .checkIn([
        "reported",
        "assigned",
        "accepted",
        "en_route",
        "arrived",
        "patient_loaded",
        "at_hospital",
        "completed",
        "cancelled",
      ]);
    t.decimal("lat", 10, 6).notNullable();
    t.decimal("lng", 10, 6).notNullable();
    t.string("address").notNullable();
    t.text("notes");
    t.string("citizen_name").notNullable();
    t.string("citizen_phone").notNullable();
    t.uuid("citizen_user_id").references("id").inTable("users").onDelete("SET NULL");
    t.uuid("driver_id").references("id").inTable("drivers").onDelete("SET NULL");
    t.uuid("vehicle_id").references("id").inTable("vehicles").onDelete("SET NULL");
    t.uuid("hospital_id").references("id").inTable("hospitals").onDelete("SET NULL");
    t.integer("sla_seconds").notNullable().defaultTo(900);
    t.timestamp("reported_at").defaultTo(knex.fn.now());
    t.timestamp("assigned_at");
    t.timestamp("completed_at");
    t.timestamps(true, true);
    t.index(["status", "priority"]);
    t.index("reported_at");
  });

  await knex.schema.createTable("incident_events", (t) => {
    t.bigIncrements("id");
    t.uuid("incident_id")
      .references("id")
      .inTable("incidents")
      .onDelete("CASCADE");
    t.string("status").notNullable();
    t.uuid("actor_id");
    t.string("actor_name");
    t.text("note");
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["incident_id", "created_at"]);
  });

  await knex.schema.createTable("notifications", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    t.uuid("user_id").references("id").inTable("users").onDelete("CASCADE");
    t.string("kind").notNullable();
    t.string("title").notNullable();
    t.text("body");
    t.jsonb("data");
    t.timestamp("read_at");
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["user_id", "created_at"]);
  });

  await knex.schema.createTable("audit_logs", (t) => {
    t.bigIncrements("id");
    t.uuid("actor_id");
    t.string("actor_role");
    t.string("action").notNullable();
    t.string("target");
    t.string("ip");
    t.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("incident_events");
  await knex.schema.dropTableIfExists("incidents");
  await knex.schema.dropTableIfExists("hospitals");
  await knex.schema.dropTableIfExists("driver_locations");
  await knex.schema.dropTableIfExists("drivers");
  await knex.schema.dropTableIfExists("vehicles");
  await knex.schema.dropTableIfExists("users");
}
