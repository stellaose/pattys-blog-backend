import { Router } from "express";
import { AdminAuthController } from "../../controller/admin/admin-auth.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  adminLogin,
  adminVerifyOtp,
  adminCreatePassword,
  adminForgotPassword,
  adminResetPassword,
  adminChangePassword,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.post(
  "/login",
  processJoiValidation(adminLogin, "payload"),
  AdminAuthController.login
);

router.post(
  "/verify-login",
  processJoiValidation(adminVerifyOtp, "payload"),
  AdminAuthController.verifyLogin
);

router.post(
  "/create-password",
  processJoiValidation(adminCreatePassword, "payload"),
  AuthMiddleware.authAdmin,
  AdminAuthController.createPassword
);

router.post(
  "/forgot-password",
  processJoiValidation(adminForgotPassword, "payload"),
  AdminAuthController.forgotPassword
);

router.post(
  "/verify-forgot-password",
  processJoiValidation(adminVerifyOtp, "payload"),
  AdminAuthController.verifyForgotPassword
);

router.post(
  "/reset-password",
  processJoiValidation(adminResetPassword, "payload"),
  AdminAuthController.resetPassword
);

router.patch(
  "/change-password",
  processJoiValidation(adminChangePassword, "payload"),
  AuthMiddleware.authAdmin,
  AdminAuthController.changePassword
);

router.post("/logout", AuthMiddleware.authAdmin, AdminAuthController.logout);

export default router;
