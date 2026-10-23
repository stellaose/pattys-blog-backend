import { Router } from "express";
import { AdminContentController } from "../../controller/admin/admin-content.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import { adminContactsQuery } from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/",
  processJoiValidation(adminContactsQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminContentController.getContacts
);

export default router;
