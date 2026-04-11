import { Router } from "express";
import { AuthController } from "../../controller/user/auth.controller.js";

const router = Router();

router.post("/auth/signup", AuthController.signup);
router.get("/auth/verify-email", AuthController.verifyEmail);

export default router;
