import { Router } from "express";
import { AdminBlogController } from "../../controller/admin/admin-blog.controller.js";
import { AdminContentController } from "../../controller/admin/admin-content.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  adminBlogParams,
  adminBlogsQuery,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/",
  processJoiValidation(adminBlogsQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminContentController.getBlogs
);

router.get(
  "/:blogId",
  processJoiValidation(adminBlogParams, "params"),
  AuthMiddleware.authAdmin,
  AdminBlogController.getBlog
);

export default router;
