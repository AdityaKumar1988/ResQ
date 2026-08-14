import bcrypt from "bcryptjs";

const hash = (pw) => bcrypt.hashSync(pw, 10);

export async function seed(knex) {
  // 1. Reference Hospitals (Vellore Infrastructure)
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

  // 2. Initial Ambulance Fleet (Independent fleet resources available for driver registration)
  const vehicleCount = await knex("vehicles").count("id as c").first();
  if (Number(vehicleCount?.c || 0) === 0) {
    await knex("vehicles").insert([
      { plate: "EMS-4471", model: "Mercedes Sprinter", type: "ALS", status: "available" },
      { plate: "EMS-4472", model: "Ford E-450", type: "BLS", status: "available" },
      { plate: "EMS-4473", model: "Mercedes Sprinter", type: "ICU", status: "available" },
      { plate: "EMS-4474", model: "Ford E-450", type: "ALS", status: "available" },
      { plate: "EMS-4475", model: "Ram ProMaster", type: "BLS", status: "available" },
      { plate: "EMS-4476", model: "Mercedes Sprinter", type: "MICU", status: "available" },
    ]);
  }

  // 3. Core System Accounts (Admin & Dispatcher)
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

  // 4. Purge synthetic demo driver/citizen accounts if present
  await knex("users")
    .whereIn("email", [
      "citizen@ems.local",
      "driver1@ems.local",
      "driver2@ems.local",
      "driver3@ems.local",
      "driver4@ems.local",
      "driver5@ems.local",
      "driver6@ems.local",
      "driver7@ems.local",
      "driver8@ems.local",
    ])
    .delete();
}

