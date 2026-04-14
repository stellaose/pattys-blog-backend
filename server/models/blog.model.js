import mongoose from "mongoose";

const { Schema, model } = mongoose;

const BlogSchema = new Schema(
  {
    id: Schema.Types.ObjectId,
    blogId: String,
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
        "Other"
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
    likes: {
      type: [String],
      default: [],
    },
    dislikes: {
      type: [String],
      default: [],
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
    isFlagged: {
      type: Boolean,
      default: false,
    },
    likeStatus: {
      type: String,
      enum: ["like", "dislike"],
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    dislikeCount: {
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
  { timestamps: true }
);

export const Blog = model("Blog", BlogSchema);
