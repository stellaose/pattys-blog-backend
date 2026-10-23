import { AdminResource } from "../models/admin/admin-resources.model.js";
import { createResourceId } from "../utils/helper.js";

// * every area of the app an admin role can be given permissions on
export const adminResources = [
  "blogs",
  "reviews",
  "bloggers",
  "admins",
  "contacts",
  "roles",
];

export const seedAdminResources = async () => {
  const result = await AdminResource.bulkWrite(
    adminResources.map((name, index) => ({
      updateOne: {
        filter: { name },
        update: {
          $setOnInsert: {
            resourceId: createResourceId(index),
            name,
            isDeleted: false,
            deletedAt: null,
          },
        },
        upsert: true,
      },
    }))
  );

  return {
    inserted: result.upsertedCount,
    alreadyPresent: adminResources.length - result.upsertedCount,
  };
};
