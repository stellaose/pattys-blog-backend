import { Router } from "express";
import { AuthController } from "../../controller/user/auth.controller.js";
import { Auth } from "../../middleware/AuthMiddleware.js";

const router = Router();

router.post("/auth/signup", AuthController.signup);
router.post("/auth/verify-email", AuthController.verifyEmail);
router.post("/auth/login", AuthController.login);
router.post("/auth/forget-password", AuthController.forgetPassword);
router.post("/auth/verify-forget-password", AuthController.verifyForgetPassword);
router.post("/auth/reset-password", AuthController.resetPassword);
router.put("/auth/change-password/:userId", Auth, AuthController.changePassword);

// $ user
router.get('/auth/my-profile', Auth, AuthController.getMyProfile)
router.patch('/auth/update-me', Auth, AuthController.updateUser)

export default router;
