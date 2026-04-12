import mongoose from "mongoose";
import validator from "validator";

const { Schema, model } = mongoose;
const { isEmail } = validator;

const AuthBlogEntrySchema = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: [String],
      trim: true,
    },
  },
  { _id: false }
);

const AuthSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    userId: String,
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
      required: [true, "Password is required"],
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
      enum: ["male", "female"],
    },
    bio: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superAdmin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationTokenExpires: {
      type: Date,
    },
    passwordToken: {
      type: String,
    },
    passwordTokenExpires: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    blogs: {
      type: [AuthBlogEntrySchema],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Auth = model("Auth", AuthSchema);
