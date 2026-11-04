/**
 * Migration: Add status column to users table with CHECK constraint ('invited', 'active', 'suspended').
 * Existing rows are populated with 'active'.
 */
export async function up(knex) {
  const hasStatus = await knex.schema.hasColumn("users", "status");
  if (!hasStatus) {
    await knex.schema.alterTable("users", (t) => {
      t.string("status", 20)
        .notNullable()
        .defaultTo("active")
        .checkIn(["invited", "active", "suspended"]);
    });
  }

  // Ensure all existing rows are set to 'active'
  await knex("users").whereNull("status").orWhere({ status: "" }).update({ status: "active" });
}

export async function down(knex) {
  const hasStatus = await knex.schema.hasColumn("users", "status");
  if (hasStatus) {
    await knex.schema.alterTable("users", (t) => {
      t.dropColumn("status");
    });
  }
}
