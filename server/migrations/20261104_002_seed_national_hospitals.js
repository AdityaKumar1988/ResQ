/**
 * Migration: Add beds_source column (no default), unique index on (name, lat, lng),
 * update 4 Vellore rows' beds_source to 'demo',
 * and idempotently insert 42 national hospitals across Indian state capitals.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
  // 1. Add beds_source column without default if it does not exist
  const hasBedsSource = await knex.schema.hasColumn("hospitals", "beds_source");
  if (!hasBedsSource) {
    await knex.schema.alterTable("hospitals", (t) => {
      t.string("beds_source", 20).nullable(); // no default
    });
  }

  // 2. Set the 4 Vellore rows' beds_source to 'demo' (leaving beds, coordinates, etc. untouched)
  await knex("hospitals")
    .whereIn("name", [
      "Christian Medical College (CMC)",
      "Apollo KH Hospital",
      "Naruvi Hospital",
      "Government Vellore Medical College Hospital",
    ])
    .update({ beds_source: "demo" });

  // 3. Unique index on (name, lat, lng) for idempotency
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS "hospitals_name_lat_lng_unique" ON "hospitals" ("name", "lat", "lng")',
  );

  // 4. Load dataset
  const datasetPath = path.resolve(__dirname, "../seeds/national_hospitals.json");
  const hospitals = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

  // 5. Insert each hospital idempotently using WHERE NOT EXISTS
  for (const h of hospitals) {
    await knex.raw(
      `INSERT INTO hospitals (name, lat, lng, beds, beds_available, beds_source, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1 FROM hospitals WHERE name = ? AND lat = ? AND lng = ?
       )`,
      [h.name, h.lat, h.lng, h.beds, h.beds_available, h.beds_source, h.name, h.lat, h.lng],
    );
  }
}

export async function down(knex) {
  const datasetPath = path.resolve(__dirname, "../seeds/national_hospitals.json");
  if (fs.existsSync(datasetPath)) {
    const hospitals = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
    const names = hospitals.map((h) => h.name);
    await knex("hospitals").whereIn("name", names).delete();
  }
  await knex.raw('DROP INDEX IF EXISTS "hospitals_name_lat_lng_unique"');
  await knex("hospitals")
    .whereIn("name", [
      "Christian Medical College (CMC)",
      "Apollo KH Hospital",
      "Naruvi Hospital",
      "Government Vellore Medical College Hospital",
    ])
    .update({ beds_source: null });

  const hasBedsSource = await knex.schema.hasColumn("hospitals", "beds_source");
  if (hasBedsSource) {
    await knex.schema.alterTable("hospitals", (t) => {
      t.dropColumn("beds_source");
    });
  }
}
