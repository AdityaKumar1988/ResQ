/**
 * Add constraints to drivers table:
 * - One driver profile per user (unique user_id)
 * - Unique vehicle assignment (unique vehicle_id)
 */
export async function up(knex) {
  await knex.schema.alterTable("drivers", (t) => {
    t.unique("user_id", "drivers_user_id_unique");
  });

  // Unique index on vehicle_id where vehicle_id is not null
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS "drivers_vehicle_id_unique" ON "drivers" ("vehicle_id") WHERE "vehicle_id" IS NOT NULL'
  );
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS "drivers_vehicle_id_unique"');
  await knex.schema.alterTable("drivers", (t) => {
    t.dropUnique(["user_id"], "drivers_user_id_unique");
  });
}
