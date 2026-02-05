import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;
const { isEmail, isDate } = validator;

const AdminSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    first_name: {
      type: String,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      validate: [isEmail, "Please enter your email"],
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
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
  { timestamps: true }
);

export const Admin = model("Admin", AdminSchema);
