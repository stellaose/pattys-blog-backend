/* eslint-disable no-undef, no-console */
import "../load-env.js";
import mongoose from "mongoose";
import databaseConnect from "../database/index.js";
import { seedAdminResources } from "./admin-resources.seed.js";
import { seedAdminRoles } from "./admin-role.seed.js";

// ! add new seeders here, in the order they must run
const seeders = [
  ["admin roles", seedAdminRoles],
  ["admin resources", seedAdminResources],
];

const run = async () => {
  databaseConnect.getConnect();
  await mongoose.connection.asPromise();

  for (const [label, seed] of seeders) {
    const result = await seed();
    console.log(`Seeded ${label}:`, result);
  }
};

run()
  .catch(error => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
