import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AdminActivityLogSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    adminId: {
      type: String,
      required: true,
    },
    logId: {
      type: String,
      required: true,
      unique: true,
    },
    activity_type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    activity_status: {
      type: String,
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

export const AdminActivityLog = model(
  "AdminActivityLog",
  AdminActivityLogSchema
);
