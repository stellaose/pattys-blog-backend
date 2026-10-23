import { AdminRoles } from "../../models/admin/admin-roles.model.js";
import AdminRoleService, {
  toRoleType,
} from "../../service/admin/admin-role.service.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import logger from "../../logger/logger.js";
import { createId } from "../../utils/helper.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  statusEnum,
} from "../../enums/index.js";
import {
  adminActivityTracking,
  adminDescriptions,
} from "../../lib/admin/index.js";

const { adminOpCodes, activityStatus, roleStatus } = statusEnum;

export const AdminRoleController = {
  createRole: async (req, res, next) => {
    try {
      const { name, status } = req.body;

      // ! role names are unique across live and deleted roles
      await AdminRoleService.confirmThatRoleDoesNotExist(
        name,
        adminLabelEnum.CREATE_ROLE
      );

      const role = await AdminRoles.create({
        roleId: createId("role", 24),
        role: toRoleType(name),
        name,
        code: await AdminRoleService.generateUniqueAdminRoleCode(),
        status: status ?? roleStatus.ACTIVE,
      });

      adminActivityTracking(
        req.adminId,
        adminOpCodes.CREATE_ROLE,
        activityStatus.SUCCESS,
        adminName => adminDescriptions.create_role(adminName, role.name)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_ROLE}-${adminMessagesEnum.ROLE_CREATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: adminMessagesEnum.ROLE_CREATED_SUCCESSFULLY,
        role,
      });
    } catch (error) {
      logger.error(
        `Create role failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.CREATE_ROLE}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.CREATE_ROLE,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.create_role_failed(adminName, req.body?.name)
      );
      next(error);
    }
  },

  getAllRoles: async (req, res, next) => {
    try {
      const { search, status, startDate, endDate, page, limit } = req.query;

      const {
        roles,
        total: rolesCount,
        resultPerPage,
        currentPage,
      } = await AdminRoleService.getAdminRolesAndPermissions({
        search,
        status,
        startDate,
        endDate,
        page,
        limit,
      });

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_ROLES}-${adminMessagesEnum.ROLES_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLES_FETCHED_SUCCESSFULLY,
        roles,
        pagination: {
          count: roles.length,
          totalRoles: rolesCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(rolesCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get all roles failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_ROLES}`,
        error.message
      );
      next(error);
    }
  },

  getOneRole: async (req, res, next) => {
    try {
      const { roleId } = req.params;

      const role = await AdminRoleService.getRoleWithPermissions(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ROLE}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ' every resource, with [] where the role has no actions on it
      const permissionMatrix = AdminRoleService.processRoleBasedPermissions(
        role.permissions ?? [],
        await AdminRoleService.getAdminResources()
      );

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ROLE}-${adminMessagesEnum.ROLE_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLE_FETCHED_SUCCESSFULLY,
        role,
        permissionMatrix,
      });
    } catch (error) {
      logger.error(
        `Get one role failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ROLE}`,
        error.message
      );
      next(error);
    }
  },

  editRole: async (req, res, next) => {
    let role;
    try {
      const { roleId } = req.params;
      const { name } = req.body;

      role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ROLE}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ! role names are unique across live and deleted roles, apart from this role itself
      await AdminRoleService.confirmThatRoleDoesNotExist(
        name,
        adminLabelEnum.EDIT_ROLE,
        role.roleId
      );

      role.name = name;
      role.role = toRoleType(name);
      await role.save();
      await AdminRoleService.renameRolePermissions(role.roleId, role.role);

      adminActivityTracking(
        req.adminId,
        adminOpCodes.EDIT_ROLE,
        activityStatus.SUCCESS,
        adminName => adminDescriptions.edit_role(adminName, role.name)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ROLE}-${adminMessagesEnum.ROLE_UPDATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLE_UPDATED_SUCCESSFULLY,
        role,
      });
    } catch (error) {
      logger.error(
        `Edit role failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ROLE}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.EDIT_ROLE,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.edit_role_failed(
            adminName,
            role?.name ?? req.params.roleId
          )
      );
      next(error);
    }
  },

  updateRoleStatus: async (req, res, next) => {
    let role;
    try {
      const { roleId } = req.params;
      const { status } = req.body;

      role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ROLE_STATUS}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (role.status === status) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ROLE_STATUS}-${adminMessagesEnum.ROLE_STATUS_UNCHANGED(status)}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_STATUS_UNCHANGED(status),
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      await AdminRoleService.updateAdminRoleStatus(role, status);

      // = activating and deactivating are logged as separate activities
      const isActivating = status === roleStatus.ACTIVE;
      adminActivityTracking(
        req.adminId,
        isActivating
          ? adminOpCodes.ACTIVATE_ROLE
          : adminOpCodes.DEACTIVATE_ROLE,
        activityStatus.SUCCESS,
        adminName =>
          isActivating
            ? adminDescriptions.activate_role(adminName, role.name)
            : adminDescriptions.deactivate_role(adminName, role.name)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ROLE_STATUS}-${adminMessagesEnum.ROLE_STATUS_UPDATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLE_STATUS_UPDATED_SUCCESSFULLY,
        role,
      });
    } catch (error) {
      logger.error(
        `Update role status failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ROLE_STATUS}`,
        error.message
      );
      const isActivating = req.body?.status === roleStatus.ACTIVE;
      const roleName = role?.name ?? req.params.roleId;
      adminActivityTracking(
        req.adminId,
        isActivating
          ? adminOpCodes.ACTIVATE_ROLE
          : adminOpCodes.DEACTIVATE_ROLE,
        activityStatus.FAILED,
        adminName =>
          isActivating
            ? adminDescriptions.activate_role_failed(adminName, roleName)
            : adminDescriptions.deactivate_role_failed(adminName, roleName)
      );
      next(error);
    }
  },

  deleteRole: async (req, res, next) => {
    let role;
    try {
      const { roleId } = req.params;

      role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ROLE}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ! admins inherit permissions from their role, so it can't go while in use
      const adminsWithRole = await AdminRoleService.countAdminsWithRole(
        role.roleId
      );
      if (adminsWithRole > 0) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ROLE}-${adminMessagesEnum.ROLE_IN_USE}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_IN_USE,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      await AdminRoleService.deleteAdminRole(role);

      adminActivityTracking(
        req.adminId,
        adminOpCodes.DELETE_ROLE,
        activityStatus.SUCCESS,
        adminName => adminDescriptions.delete_role(adminName, role.name)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ROLE}-${adminMessagesEnum.ROLE_DELETED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLE_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      logger.error(
        `Delete role failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ROLE}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.DELETE_ROLE,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.delete_role_failed(
            adminName,
            role?.name ?? req.params.roleId
          )
      );
      next(error);
    }
  },

  setRolePermissions: async (req, res, next) => {
    let role;
    let resourceNames;
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.SET_ROLE_PERMISSIONS}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const resources = await AdminRoleService.validateRolePermissionsArray(
        permissions,
        adminLabelEnum.SET_ROLE_PERMISSIONS
      );
      resourceNames = resources.map(({ name }) => name).join(", ");

      await AdminRoleService.upsertRolePermissions(role, permissions, () =>
        createId("roleperm", 24)
      );

      const roleWithPermissions = await AdminRoleService.getRoleWithPermissions(
        role.roleId
      );

      adminActivityTracking(
        req.adminId,
        adminOpCodes.SET_ROLE_PERMISSIONS,
        activityStatus.SUCCESS,
        adminName =>
          adminDescriptions.set_role_permissions(
            adminName,
            role.name,
            resourceNames
          )
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.SET_ROLE_PERMISSIONS}-${adminMessagesEnum.ROLE_PERMISSIONS_UPDATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ROLE_PERMISSIONS_UPDATED_SUCCESSFULLY,
        role: roleWithPermissions,
      });
    } catch (error) {
      logger.error(
        `Set role permissions failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.SET_ROLE_PERMISSIONS}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.SET_ROLE_PERMISSIONS,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.set_role_permissions_failed(
            adminName,
            role?.name ?? req.params.roleId,
            resourceNames ??
              (req.body?.permissions ?? [])
                .map(({ resourceId }) => resourceId)
                .join(", ")
          )
      );
      next(error);
    }
  },

  getAdminsByRole: async (req, res, next) => {
    try {
      const { roleId } = req.params;
      const { search, status, startDate, endDate, page, limit } = req.query;

      const role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ADMINS_BY_ROLE}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const {
        admins,
        total: adminsCount,
        resultPerPage,
        currentPage,
      } = await AdminRoleService.getAdminsByRole({
        roleId,
        search,
        status,
        startDate,
        endDate,
        page,
        limit,
      });

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ADMINS_BY_ROLE}-${adminMessagesEnum.ADMINS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMINS_FETCHED_SUCCESSFULLY,
        role: { roleId: role.roleId, name: role.name, role: role.role },
        admins,
        pagination: {
          count: admins.length,
          totalAdmins: adminsCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(adminsCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get admins by role failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ADMINS_BY_ROLE}`,
        error.message
      );
      next(error);
    }
  },
};
