import mongoose from "mongoose";
import { softDeletePlugin } from "../plugins/soft-delete.plugin.js";

const { Schema, model } = mongoose;


const AdminResourceSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    resourceId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, "Resource name is required"],
      unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// > hasMany: AdminRolePermission.resourceId -> AdminResource.resourceId
AdminResourceSchema.virtual("permissions", {
  ref: "AdminRolePermission",
  localField: "resourceId",
  foreignField: "resourceId",
});

AdminResourceSchema.plugin(softDeletePlugin);

export const AdminResource = model("AdminResource", AdminResourceSchema);
