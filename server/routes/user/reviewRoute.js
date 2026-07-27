import { Router } from "express";
import dotenv from "dotenv";
import AuthMiddleWare from "../../middleware/AuthMiddleware.js";
import ReviewController from "../../controller/user/review.controller.js";
import {
  processJoiValidation,
  createBlogReview,
  blogParams,
  reviewParams,
} from "../../utils/utils.validation.js";

dotenv.config({ quiet: true });

const router = Router();

router.post(
  "/:blogId",
  processJoiValidation(createBlogReview, "payload"),
  processJoiValidation(blogParams, "params"),
  AuthMiddleWare.auth,
  ReviewController.createReview
);

router.delete(
  "/:reviewId",
  processJoiValidation(reviewParams, "params"),
  AuthMiddleWare.auth,
  ReviewController.deleteReview
);

router.get(
  "/:blogId",
  processJoiValidation(blogParams, "params"),
  AuthMiddleWare.auth,
  ReviewController.getReviewsByBlogId
);

export default router;
