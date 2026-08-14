import bcrypt from "bcryptjs";


const OPS = { lat: 12.9692, lng: 79.1559 };
const hash = (pw) => bcrypt.hashSync(pw, 10);

export async function seed(knex) {
  // Only seed hospitals if table is empty
  const hospitalCount = await knex("hospitals").count("id as c").first();
  if (Number(hospitalCount?.c || 0) === 0) {
    await knex("hospitals").insert([
      {
        name: "Christian Medical College (CMC)",
        lat: 12.9249,
        lng: 79.135,
        beds: 300,
        beds_available: 180,
      },
      {
        name: "Apollo KH Hospital",
        lat: 12.9168,
        lng: 79.1322,
        beds: 220,
        beds_available: 95,
      },
      {
        name: "Naruvi Hospital",
        lat: 12.9788,
        lng: 79.1673,
        beds: 250,
        beds_available: 140,
      },
      {
        name: "Government Vellore Medical College Hospital",
        lat: 12.9306,
        lng: 79.1326,
        beds: 350,
        beds_available: 210,
      },
    ]);
  }

  // Seed default admin and dispatcher if missing
  const adminExists = await knex("users").where({ email: "admin@ems.local" }).first();
  if (!adminExists) {
    await knex("users").insert({
      email: "admin@ems.local",
      password_hash: hash("admin1234"),
      name: "Admin User",
      role: "admin",
    });
  }

  const dispatchExists = await knex("users").where({ email: "dispatch@ems.local" }).first();
  if (!dispatchExists) {
    await knex("users").insert({
      email: "dispatch@ems.local",
      password_hash: hash("dispatch1234"),
      name: "Dana Dispatcher",
      role: "dispatcher",
    });
  }
}
