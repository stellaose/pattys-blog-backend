// Migration (migrate-mongo format): prepares the `adminresources` collection
// for the soft-delete plugin.
//
// 1. Backfills `isDeleted` / `deletedAt` on resources saved before the plugin
//    added those fields.
// 2. Replaces the plain unique index on `name` with one that only covers live
//    resources, so a soft-deleted "blogs" no longer blocks creating a new one.
//
// `db` is the raw MongoDB driver, not Mongoose, so the plugin's live-only
// filter does not apply here and every document is visible.

const COLLECTION = "adminresources";
const PLAIN_NAME_INDEX = "name_1";
const LIVE_NAME_INDEX = "name_1_live";

const indexExists = async (collection, name) =>
  (await collection.indexes()).some(index => index.name === name);

export const up = async db => {
  const resources = db.collection(COLLECTION);

  // ! backfill first: the partial index below only covers `isDeleted: false`,
  // so a resource missing the field would escape the uniqueness check
  await resources.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false, deletedAt: null } }
  );

  if (await indexExists(resources, PLAIN_NAME_INDEX)) {
    await resources.dropIndex(PLAIN_NAME_INDEX);
  }

  await resources.createIndex(
    { name: 1 },
    {
      name: LIVE_NAME_INDEX,
      unique: true,
      partialFilterExpression: { isDeleted: false },
    }
  );
};

export const down = async db => {
  const resources = db.collection(COLLECTION);

  if (await indexExists(resources, LIVE_NAME_INDEX)) {
    await resources.dropIndex(LIVE_NAME_INDEX);
  }

  // ? fails if a live and a soft-deleted resource now share a name; resolve
  // those duplicates before rolling back
  await resources.createIndex(
    { name: 1 },
    { name: PLAIN_NAME_INDEX, unique: true }
  );

  // the backfilled fields are left in place: the plugin still expects them
};
