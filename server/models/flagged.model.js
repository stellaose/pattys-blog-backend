import mongoose from "mongoose";

const { Schema, model } = mongoose;

const FlaggedSchema = new Schema(
  {
    blogId: String,
    flaggedId: String,
    title: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      enum: [
        "News",
        "Politics",
        "Entertainment",
        "Sports",
        "Business",
        "Education",
        "Other",
      ],
    },
    description: {
      type: [String],
      trim: true,
    },
    likeNo: {
      type: Number,
      default: 0,
    },
    dislikeNo: {
      type: Number,
      default: 0,
    },
    comment: [
      {
        author: {
          type: String,
          ref: "Auth",
          required: true,
        },
        comment: {
          type: String,
          required: true,
        },
        likeNo: {
          type: Number,
          required: true,
        },
      },
    ],
    author: {
      type: String,
      ref: "Auth",
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
  { timestamps: true }
);

FlaggedSchema.virtual("blog", {
  ref: "Blog",
  localField: "blogId",
  foreignField: "blogId",
  justOne: true,
});

FlaggedSchema.set("toJSON", { virtuals: true });
FlaggedSchema.set("toObject", { virtuals: true });

export const Flagged = model("Flagged", FlaggedSchema);
