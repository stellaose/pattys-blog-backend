import { Router } from "express";
import { AdminRoleController } from "../../controller/admin/admin-role.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  roleParams,
  createRole,
  editRole,
  updateRoleStatus,
  setRolePermissions,
  rolesQuery,
  adminsByRoleQuery,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.post(
  "/",
  processJoiValidation(createRole, "payload"),
  AuthMiddleware.authAdmin,
  AdminRoleController.createRole
);

router.get(
  "/",
  processJoiValidation(rolesQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminRoleController.getAllRoles
);

router.get(
  "/:roleId",
  processJoiValidation(roleParams, "params"),
  AuthMiddleware.authAdmin,
  AdminRoleController.getOneRole
);

router.patch(
  "/:roleId",
  processJoiValidation(roleParams, "params"),
  processJoiValidation(editRole, "payload"),
  AuthMiddleware.authAdmin,
  AdminRoleController.editRole
);

router.patch(
  "/:roleId/status",
  processJoiValidation(roleParams, "params"),
  processJoiValidation(updateRoleStatus, "payload"),
  AuthMiddleware.authAdmin,
  AdminRoleController.updateRoleStatus
);

router.delete(
  "/:roleId",
  processJoiValidation(roleParams, "params"),
  AuthMiddleware.authAdmin,
  AdminRoleController.deleteRole
);

router.get(
  "/:roleId/admins",
  processJoiValidation(roleParams, "params"),
  processJoiValidation(adminsByRoleQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminRoleController.getAdminsByRole
);

router.post(
  "/:roleId/permissions",
  processJoiValidation(roleParams, "params"),
  processJoiValidation(setRolePermissions, "payload"),
  AuthMiddleware.authAdmin,
  AdminRoleController.setRolePermissions
);

export default router;
