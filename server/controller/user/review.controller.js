import { messagesEnum, labelEnum, statusEnum } from "../../enums/index.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import logger from "../../logger/logger.js";
import { Blog } from "../../models/blog.model.js";
import mongoose from "mongoose";
import { Review } from "../../models/review.model.js";
import { nanoid } from "nanoid";

const toBlogReviewEntry = (doc, userId) => ({
  author: userId,
  reviewId: doc.reviewId,
  review: doc.review,
  likeNo: doc.likeNo,
});

const ReviewController = {
  createReview: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const { userId } = req;
      const { review } = req.body;
      const blogId = req.params.blogId;

      if (!blogId) {
        logger.warn(
          `${messagesEnum.BLOG_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.BLOG_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!review) {
        logger.warn(
          `${messagesEnum.REQUEST_BODY_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_REVIEW}`
        );
        throw new ErrorResponse(
          "Review is required",
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      session.startTransaction();

      const [newReview] = await Review.create(
        [
          {
            author: userId,
            blogId,
            reviewId: `review-${nanoid(24).replaceAll("_", "").replaceAll("-", "")}`,
            review,
          },
        ],
        { session }
      );

      if (!newReview) {
        logger.warn(
          `${messagesEnum.REVIEW_NOT_CREATED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.REVIEW_NOT_CREATED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const updateBlog = await Blog.findOneAndUpdate(
        { blogId },
        { $push: { review: toBlogReviewEntry(newReview, userId) } },
        { new: true, session }
      );

      if (!updateBlog) {
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (session.inTransaction()) {
        await session.commitTransaction();
      }

      logger.info(
        `${messagesEnum.REVIEW_CREATED_SUCCESSFULLY}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_REVIEW}`
      );

      res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: messagesEnum.REVIEW_CREATED_SUCCESSFULLY,
        review: newReview,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `${error.message}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_REVIEW}`
      );
      next(error);
    } finally {
      await session.endSession();
    }
  },

  editReview: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const reviewId = req.params.reviewId;
      const { review } = req.body;

      if (!reviewId) {
        logger.warn(
          `${messagesEnum.REVIEW_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.REVIEW_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      session.startTransaction();

      const updateReview = await Review.findOneAndUpdate(
        { reviewId },
        { review, isEdited: true },
        { new: true, session }
      )
        .populate("author")
        .populate("blogId");

      if (!updateReview) {
        logger.warn(
          `${messagesEnum.REVIEW_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.REVIEW_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (session.inTransaction()) {
        await session.commitTransaction();
      }
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `${error.message}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.EDIT_REVIEW}`
      );
      next(error);
    } finally {
      await session.endSession();
    }
  },

  deleteReview: async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      const reviewId = req.params.reviewId;

      if (!reviewId) {
        logger.warn(
          `${messagesEnum.REVIEW_ID_REQUIRED}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.REVIEW_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      session.startTransaction();

      const review = await Review.findOneAndDelete({ reviewId }, { session });
      if (!review) {
        logger.warn(
          `${messagesEnum.REVIEW_NOT_FOUND}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_REVIEW}`
        );
        throw new ErrorResponse(
          messagesEnum.REVIEW_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const updateBlog = await Blog.findOneAndUpdate(
        { "review.reviewId": reviewId },
        { $pull: { review: { reviewId } } },
        { new: true, session }
      );

      if (!updateBlog) {
        throw new ErrorResponse(
          messagesEnum.BLOG_NOT_FOUND,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (session.inTransaction()) {
        await session.commitTransaction();
      }

      logger.info(
        `${messagesEnum.REVIEW_DELETED_SUCCESSFULLY}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_REVIEW}`
      );

      res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.REVIEW_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `${error.message}::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.DELETE_REVIEW}`
      );
      next(error);
    } finally {
      await session.endSession();
    }
  },
};

export default ReviewController;
