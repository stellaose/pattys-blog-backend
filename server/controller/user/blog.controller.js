import { Auth } from "../../models/user/auth.model.js";
import { Blog } from "../../models/user/blog.model.js";
import { messagesEnum, labelEnum, statusEnum } from "../../enums/index.js";
import BlogsService from "../../service/user/blog.service.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import logger from "../../logger/logger.js";
import mongoose from "mongoose";
import { createId } from "../../utils/helper.js";
import {
  userActivityTracking,
  descriptions,
} from "../../lib/user/index.js";

// = like / dislike / none each log as their own activity
const reactionTracking = {
  like: {
    op: statusEnum.opCodes.LIKE_BLOG,
    description: descriptions.like_blog,
    failedDescription: descriptions.like_blog_failed,
  },
  dislike: {
    op: statusEnum.opCodes.DISLIKE_BLOG,
    description: descriptions.dislike_blog,
    failedDescription: descriptions.dislike_blog_failed,
  },
  none: {
    op: statusEnum.opCodes.REMOVE_BLOG_REACTION,
    description: descriptions.remove_blog_reaction,
    failedDescription: descriptions.remove_blog_reaction_failed,
  },
};

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
      const blogs = await BlogsService.attachAuthorDetails(
        await features.query
      );

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ALL_BLOGS}-${messagesEnum.BLOG_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_FETCHED_SUCCESSFULLY,
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
        `Get all blogs failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ALL_BLOGS}`,
        error.message
      );
      next(error);
    }
  },

  getMyBlogs: async (req, res, next) => {
    try {
      const userId = req.userId;
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }
      delete queryParams.author;

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        BlogsService.getUserUnflaggedBlogs(userId),
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

      const allForAuth = await BlogsService.getUserBlogs(userId);

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_MY_BLOG}-${messagesEnum.BLOG_FETCHED_SUCCESSFULLY}`
      );
      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_FETCHED_SUCCESSFULLY,
        blog: await BlogsService.attachAuthorDetails(allForAuth),
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
        `Get my blogs failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_MY_BLOGS}`,
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
          `Blog id is required::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ONE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const blog = await BlogsService.getOneBlog(blogId);
      if (!blog) {
        logger.warn(
          `Blog not found::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ONE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ONE_BLOG}-${messagesEnum.BLOG_FETCHED_SUCCESSFULLY}`
      );
      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_FETCHED_SUCCESSFULLY,
        blog: await BlogsService.attachAuthorDetailsToOne(blog),
      });
    } catch (error) {
      logger.error(
        `Get one blog failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ONE_BLOG}`,
        error.message
      );
      next(error);
    }
  },

  createBlog: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const { title, description, category } = req.body;

      if (!title) {
        logger.warn(
          `${messagesEnum.BLOG_TITLE_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_TITLE_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!description) {
        logger.warn(
          `${messagesEnum.BLOG_DESCRIPTION_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_DESCRIPTION_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      session.startTransaction();
      const [blog] = await Blog.create(
        [
          {
            author: req.userId,
            blogId: createId("blog", 24),
            title,
            description,
            category: category ? category?.toLowerCase() : "other",
          },
        ],
        { session }
      );

      const updateUser = await Auth.findOneAndUpdate(
        { userId: req.userId },
        { $push: { blogs: toAuthBlogEntry(blog) } },
        { new: true, session }
      );

      if (updateUser) {
        logger.info(
          `User blogs updated::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_BLOG}::${messagesEnum.USER_BLOG_UPDATE}`
        );
      }

      await session.commitTransaction();

      userActivityTracking(
        req.userId,
        statusEnum.opCodes.CREATE_BLOG,
        statusEnum.activityStatus.SUCCESS,
        name => descriptions.create_blog(name, blog.title)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_BLOG}-${messagesEnum.BLOG_CREATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: messagesEnum.BLOG_CREATED_SUCCESSFULLY,
        blog,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Create blog failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_BLOG}`,
        error.message
      );
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.CREATE_BLOG,
        statusEnum.activityStatus.FAILED,
        name => descriptions.create_blog_failed(name, req.body?.title)
      );
      next(error);
    } finally {
      session.endSession();
    }
  },

  editBlog: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const { title, description, category } = req.body;
      const blogId = req.params.blogId;

      if (!blogId) {
        logger.warn(
          `${messagesEnum.BLOG_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      session.startTransaction();

      const blog = await Blog.findOneAndUpdate(
        { blogId },
        {
          title,
          description,
          category: category ? category?.toLowerCase() : "other",
        },
        { new: true, session }
      );
      if (!blog) {
        logger.warn(
          `${messagesEnum.BLOG_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const updateUser = await Auth.findOneAndUpdate(
        { userId: req.userId },
        { $push: { blogs: toAuthBlogEntry(blog) } },
        { new: true, session }
      );

      if (!updateUser) {
        logger.warn(
          `${messagesEnum.USER_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      } else {
        logger.info(
          `User blogs updated::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}::${messagesEnum.USER_BLOG_UPDATE}`
        );
      }

      await session.commitTransaction();

      userActivityTracking(
        req.userId,
        statusEnum.opCodes.EDIT_BLOG,
        statusEnum.activityStatus.SUCCESS,
        name => descriptions.edit_blog(name, blogId)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}-${messagesEnum.BLOG_UPDATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_UPDATED_SUCCESSFULLY,
        blog: await BlogsService.attachAuthorDetailsToOne(blog),
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Edit blog failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_BLOG}`,
        error.message
      );
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.EDIT_BLOG,
        statusEnum.activityStatus.FAILED,
        name => descriptions.edit_blog_failed(name, req.params.blogId)
      );
      next(error);
    } finally {
      session.endSession();
    }
  },

  likeDislikeBlog: async (req, res, next) => {
    try {
      const { likeStatus } = req.body;
      const blogId = req.params.blogId;

      if (!blogId) {
        logger.warn(
          `${messagesEnum.BLOG_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (likeStatus === "like") {
        const blog = await Blog.findOneAndUpdate(
          { blogId },
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
        if (!blog) {
          logger.warn(
            `${messagesEnum.BLOG_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}`
          );
          throw new ErrorResponse(
            messagesEnum.BLOG_NOT_FOUND,
            statusEnum.statusCode.HTTP_NOT_FOUND
          );
        } else {
          userActivityTracking(
            req.userId,
            reactionTracking[likeStatus].op,
            "success",
            name => reactionTracking[likeStatus].description(name, blogId)
          );
          logger.info(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}-${messagesEnum.BLOG_LIKED_SUCCESSFULLY}`
          );
        }
        return res.status(statusEnum.statusCode.HTTP_OK).json({
          code: statusEnum.statusCode.HTTP_OK,
          success: true,
          message: messagesEnum.BLOG_LIKED_SUCCESSFULLY,
          blog: await BlogsService.attachAuthorDetailsToOne(blog),
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
        if (!blog) {
          logger.warn(
            `${messagesEnum.BLOG_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}`
          );
          throw new ErrorResponse(
            messagesEnum.BLOG_NOT_FOUND,
            statusEnum.statusCode.HTTP_NOT_FOUND
          );
        } else {
          userActivityTracking(
            req.userId,
            reactionTracking[likeStatus].op,
            "success",
            name => reactionTracking[likeStatus].description(name, blogId)
          );
          logger.info(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}-${messagesEnum.BLOG_DISLIKED_SUCCESSFULLY}`
          );
        }

        return res.status(statusEnum.statusCode.HTTP_OK).json({
          code: statusEnum.statusCode.HTTP_OK,
          success: true,
          message: messagesEnum.BLOG_DISLIKED_SUCCESSFULLY,
          blog: await BlogsService.attachAuthorDetailsToOne(blog),
        });
      }

      if (likeStatus === "none") {
        const blog = await Blog.findOneAndUpdate(
          { blogId },
          [
            {
              $set: {
                likes: {
                  $setDifference: [{ $ifNull: ["$likes", []] }, [req.userId]],
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
                likeNo: { $size: "$likes" },
                dislikeNo: { $size: "$dislikes" },
              },
            },
          ],
          { new: true, updatePipeline: true }
        );
        if (!blog) {
          logger.warn(
            `${messagesEnum.BLOG_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}`
          );
          throw new ErrorResponse(
            messagesEnum.BLOG_NOT_FOUND,
            statusEnum.statusCode.HTTP_NOT_FOUND
          );
        } else {
          userActivityTracking(
            req.userId,
            reactionTracking[likeStatus].op,
            "success",
            name => reactionTracking[likeStatus].description(name, blogId)
          );
          logger.info(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}-${messagesEnum.BLOG_REACTION_REMOVED_SUCCESSFULLY}`
          );
        }

        return res.status(statusEnum.statusCode.HTTP_OK).json({
          code: statusEnum.statusCode.HTTP_OK,
          success: true,
          message: messagesEnum.BLOG_REACTION_REMOVED_SUCCESSFULLY,
          blog: await BlogsService.attachAuthorDetailsToOne(blog),
        });
      }
    } catch (error) {
      logger.error(
        `Like/Dislike post failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.LIKE_DISLIKE_BLOG}`,
        error.message
      );
      const reaction = reactionTracking[req.body?.likeStatus];
      if (reaction) {
        userActivityTracking(
          req.userId,
          reaction.op,
          "failed",
          name => reaction.failedDescription(name, req.params.blogId)
        );
      }
      next(error);
    }
  },

  deleteBlog: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const blogId = req.params.blogId;

      if (!blogId) {
        logger.warn(
          `${messagesEnum.BLOG_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }
      session.startTransaction();
      const blog = await Blog.findOneAndDelete({ blogId }, { session });
      if (!blog) {
        logger.warn(
          `${messagesEnum.BLOG_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const deleteUserBlog = await Auth.findOneAndUpdate(
        { userId: req.userId },
        {
          $pull: {
            blogs: { id: blog._id },
          },
        },
        { session }
      );

      if (!deleteUserBlog) {
        logger.warn(
          `${messagesEnum.USER_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_BLOG}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      await session.commitTransaction();
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.DELETE_BLOG,
        statusEnum.activityStatus.SUCCESS,
        name => descriptions.delete_blog(name, blogId)
      );
      logger.info(
        `${messagesEnum.BLOG_DELETED_SUCCESSFULLY}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_BLOG}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.BLOG_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Delete post failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_BLOG}`,
        error.message
      );
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.DELETE_BLOG,
        statusEnum.activityStatus.FAILED,
        name => descriptions.delete_blog_failed(name, req.params.blogId)
      );
      next(error);
    } finally {
      session.endSession();
    }
  },
};
