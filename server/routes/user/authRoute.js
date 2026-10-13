import { Router } from "express";
import { AuthController } from "../../controller/user/auth.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import {
  processJoiValidation,
  userIdParams,
  signup,
  verifyEmail,
  login,
  forgetPassword,
  verifyForgetPassword,
  resetPassword,
  changePassword,
} from "../../utils/utils.validation.js";

const router = Router();

router.post(
  "/signup",
  processJoiValidation(signup, "payload"),
  AuthController.signup
);

router.post(
  "/verify-email",
  processJoiValidation(verifyEmail, "payload"),
  AuthController.verifyEmail
);

router.post(
  "/resend-otp/:userId",
  processJoiValidation(userIdParams, "params"),
  AuthController.resendOtp
);

router.post(
  "/login",
  processJoiValidation(login, "payload"),
  AuthController.login
);

router.post(
  "/forgot-password",
  processJoiValidation(forgetPassword, "payload"),
  AuthController.forgetPassword
);

router.post(
  "/verify-forget-password",
  processJoiValidation(verifyForgetPassword, "payload"),
  AuthController.verifyForgetPassword
);

router.post(
  "/reset-password",
  processJoiValidation(resetPassword, "payload"),
  AuthController.resetPassword
);

router.put(
  "/change-password/:userId",
  processJoiValidation(userIdParams, "params"),
  processJoiValidation(changePassword, "payload"),
  AuthMiddleware.auth,
  AuthController.changePassword
);

router.post("/logout", AuthMiddleware.auth, AuthController.logout);

export default router;
