import { Auth } from "../../models/auth.model.js";
import { Blog } from "../../models/blog.model.js";
import { Flagged } from "../../models/flagged.model.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import { nanoid } from "nanoid";

export const FlaggedController = {
  getMyFlaggedPost: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }
      delete queryParams.author;
      
      const resultPerPage = Math.min(Number(req.query.limit) || 10, 100);
      const currentPage = Number(req.query.page) || 1;

      const features = new ApiFeatures(
        Flagged.find({ author: req.userId }),
        queryParams,
        {
          searchableFields: ["title", "description"],
          filterAllowlist: ["category"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const flaggedCount = await Flagged.countDocuments(filter);

      features.pagination(resultPerPage);
      const flagged = await features.query
        .populate({
          path: "author",
          model: "Auth",
          localField: "author",
          foreignField: "userId",
          select: "first_name last_name user_name email userId bio",
          strictPopulate: false,
        })
        .populate({
          path: "blog",
          select:
            "blogId title category description likeNo dislikeNo comment createdAt updatedAt isFlagged author",
        });

      return res.status(200).json({
        success: true,
        message: "Flagged fetched successfully",
        flagged,
        pagination: {
          count: flagged.length,
          totalBlogs: flaggedCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(flaggedCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  flagPost: async (req, res, next) => {
    try {
      const blog = await Blog.findOneAndUpdate(
        { blogId: req.params.blogId },
        { isFlagged: true },
        { new: true }
      );
      if (!blog) return next(new ErrorResponse("Blog not found", 404));

      if (blog) {
        await Flagged.create({
          blogId: blog.blogId,
          flaggedId: `flagged-${nanoid(24).replaceAll("_", "").replaceAll("-", "")}`,
          title: blog.title,
          description: blog.description,
          category: blog.category,
          author: blog.author,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Blog flagged successfully",
        flagged: blog,
      });
    } catch (error) {
      next(error);
    }
  },

  deleteFlagged: async (req, res, next) => {
    try {
      const blog = await Blog.findOneAndUpdate(
        { blogId: req.params.blogId },
        { isFlagged: false },
        { new: true }
      );
      if (!blog) return next(new ErrorResponse("Blog not found", 404));

      if (blog) {
        await Flagged.findOneAndDelete({ blogId: blog.blogId });
      }

      return res.status(200).json({
        success: true,
        message: "Blog unflagged successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },
};
