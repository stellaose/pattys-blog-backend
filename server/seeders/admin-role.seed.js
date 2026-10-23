import { AdminRoles } from "../models/admin/admin-roles.model.js";
import { createId } from "../utils/helper.js";

export const adminRoles = [
  {
    name: "admin",
    status: "active",
    code: "DHGAB",
  },
  {
    name: "super_admin",
    status: "active",
    code: "BCDAF",
  },
  {
    name: "developer",
    status: "active",
    code: "CBEFD",
  },
];

export const seedAdminRoles = async () => {
  const result = await AdminRoles.bulkWrite(
    adminRoles.map(role => ({
      updateOne: {
        filter: { role: role.name },
        update: {
          $setOnInsert: {
            roleId: createId("role", 24),
            name: role.name,
            role: role.name,
            code: role.code,
            status: role.status,
          },
        },
        upsert: true,
      },
    }))
  );

  return {
    inserted: result.upsertedCount,
    alreadyPresent: adminRoles.length - result.upsertedCount,
  };
};
