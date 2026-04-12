import { Router } from "express";
import { FlaggedController } from "../../controller/user/flagged.controller.js";
import { Auth } from "../../middleware/AuthMiddleware.js";

const router = Router();

router.get("/my-flagged", Auth, FlaggedController.getMyFlaggedPost);
router.patch("/:blogId", Auth, FlaggedController.flagPost);
router.put("/remove/:blogId", Auth, FlaggedController.deleteFlagged);

export default router;
