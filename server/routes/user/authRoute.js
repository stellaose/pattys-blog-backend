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
  updateProfile,
} from "../../utils/utils.validation.js";

const router = Router();

router.post(
  "/auth/signup",
  processJoiValidation(signup, "payload"),
  AuthController.signup
);

router.post(
  "/auth/verify-email",
  processJoiValidation(verifyEmail, "payload"),
  AuthController.verifyEmail
);

router.post(
  "/auth/resend-otp/:userId",
  processJoiValidation(userIdParams, "params"),
  AuthController.resendOtp
);

router.post(
  "/auth/login",
  processJoiValidation(login, "payload"),
  AuthController.login
);

router.post(
  "/auth/forget-password",
  processJoiValidation(forgetPassword, "payload"),
  AuthController.forgetPassword
);

router.post(
  "/auth/verify-forget-password",
  processJoiValidation(verifyForgetPassword, "payload"),
  AuthController.verifyForgetPassword
);

router.post(
  "/auth/reset-password",
  processJoiValidation(resetPassword, "payload"),
  AuthController.resetPassword
);

router.put(
  "/auth/change-password/:userId",
  processJoiValidation(userIdParams, "params"),
  processJoiValidation(changePassword, "payload"),
  AuthMiddleware.auth,
  AuthController.changePassword
);

// $ user
router.get(
  "/auth/my-profile",
  AuthMiddleware.auth,
  AuthController.getMyProfile
);

router.patch("/auth/update-me", AuthMiddleware.auth, AuthController.updateUser);

export default router;
