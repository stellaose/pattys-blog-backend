import { Router } from "express";
import { AdminContentController } from "../../controller/admin/admin-content.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import { adminBloggersQuery } from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/",
  processJoiValidation(adminBloggersQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminContentController.getBloggers
);

export default router;
