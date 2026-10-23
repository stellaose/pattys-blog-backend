import { Router } from "express";
import { AdminResourceController } from "../../controller/admin/admin-resource.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  resourceParams,
  createResource,
  editResource,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.post(
  "/",
  processJoiValidation(createResource, "payload"),
  AuthMiddleware.authAdmin,
  AdminResourceController.createResource
);

router.get(
  "/",
  AuthMiddleware.authAdmin,
  AdminResourceController.getAllResources
);

router.get(
  "/:resourceId",
  processJoiValidation(resourceParams, "params"),
  AuthMiddleware.authAdmin,
  AdminResourceController.getOneResource
);

router.patch(
  "/:resourceId",
  processJoiValidation(resourceParams, "params"),
  processJoiValidation(editResource, "payload"),
  AuthMiddleware.authAdmin,
  AdminResourceController.editResource
);

router.delete(
  "/:resourceId",
  processJoiValidation(resourceParams, "params"),
  AuthMiddleware.authAdmin,
  AdminResourceController.deleteResource
);

export default router;
