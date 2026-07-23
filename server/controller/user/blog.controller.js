import { Auth } from "../../models/auth.model.js";
import { Blog } from "../../models/blog.model.js";
import { messagesEnum, labelEnum, statusEnum } from "../../enums/index.js";
import BlogsService from "../../service/user/blog.service.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import logger from "../../logger/logger.js";
import { nanoid } from "nanoid";

const toAuthBlogEntry = doc => ({
  id: doc._id,
  title: doc.title,
  description: doc.description,
});

export const BlogController = {
  getAllBlogs: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        BlogsService.getAllUnflaggedBlogs(),
        queryParams,
        {
          searchableFields: ["title", "description"],
          filterAllowlist: ["category"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const blogsCount = await BlogsService.countDocuments(filter);

      features.pagination(resultPerPage);
      const blogs = await features.query;

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.success.BLOGS_FETCHED_SUCCESSFULLY,
        blogs,
        pagination: {
          count: blogs.length,
          totalBlogs: blogsCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(blogsCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get all blogs failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.BLOG_GET_ALL_BLOGS}`,
        error.message
      );
      next(error);
    }
  },

  getMyBlogs: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }
      delete queryParams.author;

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        BlogsService.getUserUnflaggedBlogs(req.userId),
        queryParams,
        {
          searchableFields: ["title", "description"],
          filterAllowlist: ["category"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const blogsCount = await BlogsService.countDocuments(filter);

      features.pagination(resultPerPage);
      const blog = await features.query;

      const allForAuth = BlogsService.getUserBlogs(req.userId).sort({
        createdAt: -1,
      });

      const updateUser = await Auth.updateOne(
        { userId: req.userId },
        { $set: { blogs: allForAuth.map(toAuthBlogEntry) } }
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_FETCHED_SUCCESSFULLY,
        blog,
        pagination: {
          count: blog.length,
          totalBlogs: blogsCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(blogsCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get my blogs failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.BLOG_GET_MY_BLOGS}`,
        error.message
      );
      next(error);
    }
  },

  getOneBlog: async (req, res, next) => {
    try {
      const { blogId } = req.params;

      if (!blogId) {
        logger.warn(
          `Blog id is required::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.BLOG_GET_ONE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const blog = await BlogsService.getOneBlog(blogId);
      if (!blog) {
        logger.warn(
          `Blog not found::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.BLOG_GET_ONE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_FETCHED_SUCCESSFULLY,
        blog,
      });
    } catch (error) {
      logger.error(
        `Get one blog failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.BLOG_GET_ONE_BLOG}`,
        error.message
      );
      next(error);
    }
  },

  createPost: async (req, res, next) => {
    try {
      const { title, description, category } = req.body;

      if (!title) {
        return next(new ErrorResponse("Title is required", 400));
      }

      if (!description) {
        return next(new ErrorResponse("Description is required", 400));
      }

      const blog = await Blog.create({
        author: req.userId,
        blogId: `blog-${nanoid(24).replaceAll("_", "").replaceAll("-", "")}`,
        title,
        description,
        category: category ? category : "Other",
      });

      await Auth.findOneAndUpdate(
        { userId: req.userId },
        { $push: { blogs: toAuthBlogEntry(blog) } }
      );

      return res.status(200).json({
        success: true,
        message: "Blog created successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },

  editPost: async (req, res, next) => {
    try {
      const { title, description, category } = req.body;

      const blog = await Blog.findOneAndUpdate(
        { blogId: req.params.blogId },
        {
          title,
          description,
          category: category ? category : "Other",
        },
        { new: true }
      );
      if (!blog) return next(new ErrorResponse("Blog not found", 404));

      return res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },

  likeDislikePost: async (req, res, next) => {
    try {
      const { likeStatus } = req.body;

      if (likeStatus === "like") {
        const blog = await Blog.findOneAndUpdate(
          { blogId: req.params.blogId },
          [
            {
              $set: {
                likes: {
                  $setUnion: [{ $ifNull: ["$likes", []] }, [req.userId]],
                },
                dislikes: {
                  $setDifference: [
                    { $ifNull: ["$dislikes", []] },
                    [req.userId],
                  ],
                },
              },
            },
            {
              $set: {
                likeStatus: "like",
                likeNo: { $size: "$likes" },
                dislikeNo: { $size: "$dislikes" },
              },
            },
          ],
          { new: true, updatePipeline: true }
        );
        if (!blog) return next(new ErrorResponse("Blog not found", 404));
        return res.status(200).json({
          success: true,
          message: "Blog liked successfully",
          blog,
        });
      }
      if (likeStatus === "dislike") {
        const blog = await Blog.findOneAndUpdate(
          { blogId: req.params.blogId },
          [
            {
              $set: {
                dislikes: {
                  $setUnion: [{ $ifNull: ["$dislikes", []] }, [req.userId]],
                },
                likes: {
                  $setDifference: [{ $ifNull: ["$likes", []] }, [req.userId]],
                },
              },
            },
            {
              $set: {
                likeStatus: "dislike",
                likeNo: { $size: "$likes" },
                dislikeNo: { $size: "$dislikes" },
              },
            },
          ],
          { new: true, updatePipeline: true }
        );
        if (!blog) return next(new ErrorResponse("Blog not found", 404));

        return res.status(200).json({
          success: true,
          message: "Blog disliked successfully",
          blog,
        });
      }
    } catch (error) {
      next(error);
    }
  },

  deletePost: async (req, res, next) => {
    try {
      const blog = await Blog.findOneAndDelete({ blogId: req.params.blogId });
      if (!blog) return next(new ErrorResponse("Blog not found", 404));
      return res.status(200).json({
        success: true,
        message: "Blog deleted successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },

  addCommentToPost: async (req, res, next) => {},
};
