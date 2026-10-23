import mongoose from "mongoose";
import validator from "validator";
import { softDeletePlugin } from "../plugins/soft-delete.plugin.js";

const { Schema, model } = mongoose;
const { isEmail } = validator;

const AdminAuthSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    adminId: {
      type: String,
      required: true,
      unique: true,
    },
    first_name: {
      type: String,
      trim: true,
      required: true,
    },
    last_name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      validate: [isEmail, "Please enter your email"],
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    role: {
      type: String,
      default: "admin",
      required: true,
    },
    // > the AdminRole whose permissions this admin inherits
    roleId: {
      type: String,
      required: [true, "Role is required"],
    },
    status: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: Number,
    },
    emailVerificationTokenExpires: {
      type: Date,
    },
    emailVerificationTokenCount: {
      type: Number,
      default: 0,
    },
    inValidEmailVerificationCount: {
      type: Number,
      default: 0,
    },
    is_created_password: {
      type: Boolean,
      default: false,
    },
    is_completed_profile: {
      type: Boolean,
      default: false,
    },
    passwordToken: {
      type: Number,
    },
    passwordTokenExpires: {
      type: Date,
    },
    isForgetPasswordOtp: {
      type: Boolean,
      default: false,
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

// > belongsTo AdminRole
AdminAuthSchema.virtual("adminRole", {
  ref: "AdminRole",
  localField: "roleId",
  foreignField: "roleId",
  justOne: true,
});

// < hasMany AdminUserPermission: per-admin permissions on top of the role's
AdminAuthSchema.virtual("permissions", {
  ref: "AdminUserPermission",
  localField: "adminId",
  foreignField: "adminId",
});

AdminAuthSchema.plugin(softDeletePlugin);

export const AdminAuth = model("AdminAuth", AdminAuthSchema);
