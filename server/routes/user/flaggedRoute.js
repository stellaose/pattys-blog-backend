import { Router } from "express";
import { FlaggedController } from "../../controller/user/flagged.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";

const router = Router();

router.get(
  "/my-flagged",
  AuthMiddleware.auth,
  FlaggedController.getMyFlaggedBlog
);
router.patch("/:blogId", AuthMiddleware.auth, FlaggedController.flagBlog);
router.put(
  "/remove/:blogId",
  AuthMiddleware.auth,
  FlaggedController.deleteFlagged
);

export default router;
