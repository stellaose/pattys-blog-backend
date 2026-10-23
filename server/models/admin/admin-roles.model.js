import mongoose from "mongoose";
import { softDeletePlugin } from "../plugins/soft-delete.plugin.js";

const { Schema, model } = mongoose;

const AdminRoleSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    roleId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      trim: true,
      required: [true, "Role type is required"],
      unique: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    code: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      trim: true,
      required: true,
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

AdminRoleSchema.virtual("permissions", {
  ref: "AdminRolePermission",
  localField: "roleId",
  foreignField: "roleId",
});

AdminRoleSchema.plugin(softDeletePlugin);

export const AdminRoles = model("AdminRoles", AdminRoleSchema);
