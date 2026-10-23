import { Router } from "express";
import { ContactController } from "../../controller/user/contact.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import {
  processJoiValidation,
  createContactMessage,
} from "../../utils/utils.validation.js";

const router = Router();

// Public: the contact page works for visitors who are not logged in
router.post(
  "/",
  processJoiValidation(createContactMessage, "payload"),
  ContactController.createContactMessage
);

router.get(
  "/",
  AuthMiddleware.auth,
  AuthMiddleware.requireRole("admin", "superAdmin"),
  ContactController.getAllContactMessages
);

export default router;
