import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ReviewSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    reviewId: String,
    blogId: {
      type: String,
    },
    author: {
      type: String,
    },
    review: {
      type: String,
      required: true,
    },
    likeNo: {
      type: Number,
      default: 0,
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
  }
);

export const Review = model("Review", ReviewSchema);
