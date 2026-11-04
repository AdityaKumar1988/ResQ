/**
 * Migration: Correct beds_source on national hospitals and add beds_note column.
 * - Adds nullable text column beds_note
 * - Sets beds_source = 'demo' for all 42 newly seeded national hospitals
 * - Sets beds_note = 'total: official (<source_url>)' or 'total: estimate'
 * - Leaves the 4 existing Vellore rows untouched
 * - Safe and idempotent
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function up(knex) {
  // 1. Add beds_note column if it does not exist
  const hasBedsNote = await knex.schema.hasColumn("hospitals", "beds_note");
  if (!hasBedsNote) {
    await knex.schema.alterTable("hospitals", (t) => {
      t.text("beds_note").nullable();
    });
  }

  // 2. Load dataset
  const datasetPath = path.resolve(__dirname, "../seeds/national_hospitals.json");
  const hospitals = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

  const velloreNames = [
    "Christian Medical College (CMC)",
    "Apollo KH Hospital",
    "Naruvi Hospital",
    "Government Vellore Medical College Hospital",
  ];

  // 3. Update each of the 42 new hospitals idempotently
  for (const h of hospitals) {
    if (velloreNames.includes(h.name)) continue;

    const note = h.source_url ? `total: official (${h.source_url})` : "total: estimate";

    await knex("hospitals").where({ name: h.name }).update({
      beds_source: "demo",
      beds_note: note,
      updated_at: knex.fn.now(),
    });
  }
}

export async function down(knex) {
  const hasBedsNote = await knex.schema.hasColumn("hospitals", "beds_note");
  if (hasBedsNote) {
    await knex.schema.alterTable("hospitals", (t) => {
      t.dropColumn("beds_note");
    });
  }
}
