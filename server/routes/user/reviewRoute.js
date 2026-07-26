import { Router } from "express";
import dotenv from "dotenv";
import AuthMiddleWare from "../../middleware/AuthMiddleware.js";
import ReviewController from "../../controller/user/review.controller.js";
import {
  processJoiValidation,
  createBlogReview,
  blogParams,
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

export default router;
