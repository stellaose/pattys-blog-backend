import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ContactSchema = new Schema(
  {
    contactId: String,
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    topic: {
      type: String,
      trim: true,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Contact = model("Contact", ContactSchema);
