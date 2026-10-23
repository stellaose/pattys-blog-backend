import { Router } from "express";
import { AdminActivityController } from "../../controller/admin/admin-activity.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import { activityLogQuery } from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/users",
  processJoiValidation(activityLogQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminActivityController.getUserActivity
);

router.get(
  "/admins",
  processJoiValidation(activityLogQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminActivityController.getAdminActivity
);

export default router;
