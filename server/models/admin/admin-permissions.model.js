import mongoose from "mongoose";
import { softDeletePlugin } from "../plugins/soft-delete.plugin.js";

const { Schema, model } = mongoose;

export const adminPermissionActions = ["create", "read", "update", "delete"];

const AdminRolePermissionSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    rolePermId: {
      type: String,
      required: true,
      unique: true,
    },
    roleId: {
      type: String,
      required: [true, "Role is required"],
    },
    role_type: {
      type: String,
      trim: true,
      required: [true, "Role type is required"],
    },
    resourceId: {
      type: String,
      required: [true, "Resource is required"],
    },
    permissions: {
      type: [
        {
          type: String,
          enum: adminPermissionActions,
        },
      ],
      required: true,
      validate: [
        permissions => permissions.length > 0,
        "At least one permission is required",
      ],
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

// ! one permission set per role and resource
AdminRolePermissionSchema.index({ roleId: 1, resourceId: 1 }, { unique: true });

// > belongsTo AdminRole
AdminRolePermissionSchema.virtual("role", {
  ref: "AdminRole",
  localField: "roleId",
  foreignField: "roleId",
  justOne: true,
});

// > belongsTo AdminResource
AdminRolePermissionSchema.virtual("resource", {
  ref: "AdminResource",
  localField: "resourceId",
  foreignField: "resourceId",
  justOne: true,
});

AdminRolePermissionSchema.plugin(softDeletePlugin);

export const AdminRolePermission = model(
  "AdminRolePermission",
  AdminRolePermissionSchema
);
