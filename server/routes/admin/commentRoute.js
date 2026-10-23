import { Router } from "express";
import { AdminContentController } from "../../controller/admin/admin-content.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import { adminCommentsQuery } from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/",
  processJoiValidation(adminCommentsQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminContentController.getComments
);

export default router;
