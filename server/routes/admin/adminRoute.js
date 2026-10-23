import { Router } from "express";
import { AdminController } from "../../controller/admin/admin.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  inviteAdmin,
  adminParams,
  completeAdminProfile,
  editAdmin,
  updateAdminStatus,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.post(
  "/invite",
  processJoiValidation(inviteAdmin, "payload"),
  AuthMiddleware.authAdmin,
  AdminController.inviteAdmin
);

router.get("/me", AuthMiddleware.authAdmin, AdminController.getMyProfile);

router.patch(
  "/me/complete-profile",
  processJoiValidation(completeAdminProfile, "payload"),
  AuthMiddleware.authAdmin,
  AdminController.completeProfile
);

router.get("/", AuthMiddleware.authAdmin, AdminController.getAllAdmins);

router.get(
  "/:adminId",
  processJoiValidation(adminParams, "params"),
  AuthMiddleware.authAdmin,
  AdminController.getOneAdmin
);

router.patch(
  "/:adminId",
  processJoiValidation(adminParams, "params"),
  processJoiValidation(editAdmin, "payload"),
  AuthMiddleware.authAdmin,
  AdminController.editAdmin
);

router.patch(
  "/:adminId/status",
  processJoiValidation(adminParams, "params"),
  processJoiValidation(updateAdminStatus, "payload"),
  AuthMiddleware.authAdmin,
  AdminController.updateAdminStatus
);

router.delete(
  "/:adminId",
  processJoiValidation(adminParams, "params"),
  AuthMiddleware.authAdmin,
  AdminController.deleteAdmin
);

export default router;
