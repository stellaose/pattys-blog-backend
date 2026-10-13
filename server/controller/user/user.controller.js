import mongoose from "mongoose";
import ErrorResponse from "../../utils/ErrorHandler.js";
import { Auth } from "../../models/auth.model.js";
import { Blog } from "../../models/blog.model.js";
import { Review } from "../../models/review.model.js";
import { AuthService } from "../../service/user/auth.service.js";
import BlogsService from "../../service/user/blog.service.js";
import UserService from "../../service/user/user.service.js";
import logger from "../../logger/logger.js";
import { labelEnum, messagesEnum, statusEnum } from "../../enums/index.js";

export const UserController = {
  getMyProfile: async (req, res, next) => {
    try {
      const user = await AuthService.getUserByUserId(req.userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_GET_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_GET_PROFILE}-${messagesEnum.USER_FOUND_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.USER_FOUND_SUCCESSFULLY,
        user,
      });
    } catch (error) {
      logger.error(
        `Get profile failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_GET_PROFILE}`,
        error.message
      );
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const {
        first_name,
        last_name,
        user_name,
        email,
        password,
        phone_number,
        gender,
        bio,
      } = req.body;

      const updatedDetails = {
        first_name,
        last_name,
        user_name,
        email,
        password,
        phone_number,
        gender,
        bio,
        updatedAt: new Date(),
      };

      const userId = req.userId;

      const user = await AuthService.getUserByUserId(userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_UPDATE_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_UPDATE_PROFILE}-${messagesEnum.USER_FOUND_SUCCESSFULLY}`
      );
      const updatedUser = await Auth.findOneAndUpdate(
        { userId },
        updatedDetails,
        { new: true }
      );

      if (!updatedUser) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_UPDATE_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_UPDATE_PROFILE}-${messagesEnum.USER_UPDATED_SUCCESSFULLY}`
      );

      const userObj = updatedUser.toObject();
      delete userObj.password;
      delete userObj.passwordToken;
      delete userObj.passwordTokenExpires;
      delete userObj.emailVerificationToken;
      delete userObj.emailVerificationTokenExpires;
      delete userObj.isForgetPasswordOtp;
      delete userObj.isSignupPasswordOtp;

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.USER_UPDATED_SUCCESSFULLY,
        updatedUser: userObj,
      });
    } catch (error) {
      logger.error(
        `Update user failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_UPDATE_PROFILE}`,
        error.message
      );
      next(error);
    }
  },

  deleteUser: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const userId = req.userId;
      if (!userId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_DELETE_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      session.startTransaction();
      const user = await Auth.findOneAndDelete({ userId }, { session });

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_DELETE_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const userBlogIds = await Blog.find({ author: userId })
        .session(session)
        .distinct("blogId");

      await Blog.deleteMany({ author: userId }, { session });

      // the user's own reviews, plus everyone's reviews on the deleted blogs
      await Review.deleteMany(
        { $or: [{ author: userId }, { blogId: { $in: userBlogIds } }] },
        { session }
      );

      await Blog.updateMany(
        { "review.author": userId },
        { $pull: { review: { author: userId } } },
        { session }
      );

      await Blog.updateMany(
        { $or: [{ likes: userId }, { dislikes: userId }] },
        [
          {
            $set: {
              likes: {
                $setDifference: [{ $ifNull: ["$likes", []] }, [userId]],
              },
              dislikes: {
                $setDifference: [{ $ifNull: ["$dislikes", []] }, [userId]],
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
        { session, updatePipeline: true }
      );

      await session.commitTransaction();

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_DELETE_PROFILE}-${messagesEnum.USER_DELETED_SUCCESSFULLY}`
      );
      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.USER_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Delete user failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_DELETE_PROFILE}`,
        error.message
      );
      next(error);
    } finally {
      session.endSession();
    }
  },

  getUserProfile: async (req, res, next) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_USER_PROFILE}-${messagesEnum.USER_ID_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const user = await UserService.getPublicUserByUserId(userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_USER_PROFILE}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const blogs = await BlogsService.attachAuthorDetails(
        await BlogsService.getUserUnflaggedBlogs(userId).sort({ createdAt: -1 })
      );

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_USER_PROFILE}-${messagesEnum.USER_FOUND_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.USER_FOUND_SUCCESSFULLY,
        user,
        blogs,
      });
    } catch (error) {
      logger.error(
        `Get user profile failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_USER_PROFILE}`,
        error.message
      );
      next(error);
    }
  },
};
