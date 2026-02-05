import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;
const { isEmail, isDate } = validator;

const AuthSchema = new Schema(
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
    user_name: {
      type: String,
      unique: true,
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
    phone_number: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      minLength: 11,
      maxLength: 14,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    bio: {
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

export const Auth = model("Auth", AuthSchema);
