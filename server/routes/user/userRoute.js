import { Router } from "express";
import { UserController } from "../../controller/user/user.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import {
  processJoiValidation,
  userIdParams,
  updateProfile,
} from "../../utils/utils.validation.js";

const router = Router();

router.get("/my-profile", AuthMiddleware.auth, UserController.getMyProfile);

router.patch(
  "/update-me",
  processJoiValidation(updateProfile, "payload"),
  AuthMiddleware.auth,
  UserController.updateUser
);

router.delete("/delete-me", AuthMiddleware.auth, UserController.deleteUser);

// keep last: "/:userId" would otherwise swallow the fixed paths above
router.get(
  "/:userId",
  processJoiValidation(userIdParams, "params"),
  AuthMiddleware.auth,
  UserController.getUserProfile
);

export default router;
