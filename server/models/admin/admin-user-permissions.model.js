import mongoose from "mongoose";
import { softDeletePlugin } from "../plugins/soft-delete.plugin.js";

const { Schema, model } = mongoose;

export const adminPermissionActions = ["create", "read", "update", "delete"];


const AdminUserPermissionSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    rolePermId: {
      type: String,
      required: true,
      unique: true,
    },
    // > the admin these permissions belong to
    adminId: {
      type: String,
      required: [true, "Admin is required"],
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

// ! one permission set per admin and resource
AdminUserPermissionSchema.index(
  { adminId: 1, resourceId: 1 },
  { unique: true }
);

// > belongsTo AdminAuth
AdminUserPermissionSchema.virtual("admin", {
  ref: "AdminAuth",
  localField: "adminId",
  foreignField: "adminId",
  justOne: true,
});

// > belongsTo AdminRole
AdminUserPermissionSchema.virtual("role", {
  ref: "AdminRole",
  localField: "roleId",
  foreignField: "roleId",
  justOne: true,
});

// < belongsTo AdminResource
AdminUserPermissionSchema.virtual("resource", {
  ref: "AdminResource",
  localField: "resourceId",
  foreignField: "resourceId",
  justOne: true,
});

AdminUserPermissionSchema.plugin(softDeletePlugin);

export const AdminUserPermission = model(
  "AdminUserPermission",
  AdminUserPermissionSchema
);
