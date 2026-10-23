// Soft delete, like Sequelize's `paranoid` / `deletedAt`: documents are flagged
// with `isDeleted` and stamped with `deletedAt` instead of being removed, and
// find queries skip them unless the query asks for `isDeleted` or `deletedAt`.

// `$ne: true` rather than `false` so documents saved before `isDeleted`
// existed (where the field is missing) still count as live
const liveOnly = { isDeleted: { $ne: true } };

const asksForDeleted = filter =>
  filter.isDeleted !== undefined || filter.deletedAt !== undefined;

export const softDeletePlugin = schema => {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  schema.pre(/^find/, function () {
    if (!asksForDeleted(this.getFilter())) {
      this.where(liveOnly);
    }
  });

  schema.pre("countDocuments", function () {
    if (!asksForDeleted(this.getFilter())) {
      this.where(liveOnly);
    }
  });

  schema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };
};
