import { Blog } from "../../models/user/blog.model.js";
import BlogsService from "../../service/user/blog.service.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import logger from "../../logger/logger.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  messagesEnum,
  statusEnum,
} from "../../enums/index.js";

export const AdminBlogController = {
  // # one blog with its author and reviews; admins can open flagged blogs too
  getBlog: async (req, res, next) => {
    try {
      const blog = await Blog.findOne({ blogId: req.params.blogId });

      if (!blog) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_GET_BLOG}-${messagesEnum.BLOG_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const blogWithAuthors = await BlogsService.attachAuthorDetailsToOne(blog);
      delete blogWithAuthors._id;
      delete blogWithAuthors.likes;
      delete blogWithAuthors.dislikes;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_GET_BLOG}-${adminMessagesEnum.ADMIN_BLOG_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_BLOG_FETCHED_SUCCESSFULLY,
        blog: blogWithAuthors,
      });
    } catch (error) {
      logger.error(
        `Admin get blog failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_GET_BLOG}`,
        error.message
      );
      next(error);
    }
  },
};
