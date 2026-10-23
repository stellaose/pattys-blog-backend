import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserActivityLogSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    userId: {
      type: String,
      required: true,
      index: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const UserActivityLog = model("UserActivityLog", UserActivityLogSchema);
