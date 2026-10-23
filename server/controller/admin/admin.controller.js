import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import { AdminUserPermission } from "../../models/admin/admin-user-permissions.model.js";
import { AdminAuthService } from "../../service/admin/admin-auth.service.js";
import AdminRoleService from "../../service/admin/admin-role.service.js";
import logger from "../../logger/logger.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  messagesEnum,
  statusEnum,
} from "../../enums/index.js";
import {
  createId,
  createTempPassword,
  getFullName,
} from "../../utils/helper.js";
import {
  adminActivityTracking,
  adminDescriptions,
} from "../../lib/admin/index.js";

dotenv.config({ quiet: true });

const {
  adminOpCodes,
  activityStatus,
  adminStatus,
  adminRoleTypes,
  roleStatus,
} = statusEnum;

const createPermId = () => createId("userperm", 24);

const isSuperAdmin = admin => admin?.role === adminRoleTypes.SUPER_ADMIN;

export const AdminController = {
  inviteAdmin: async (req, res, next) => {
    const session = await mongoose.startSession();
    let recipientFullName;
    try {
      const { first_name, last_name, email, gender, roleId, permissions } =
        req.body;
      recipientFullName = `${first_name} ${last_name}`;

      if (!req.adminId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${messagesEnum.UNAUTHORIZED}`
        );
        throw new ErrorResponse(
          messagesEnum.UNAUTHORIZED,
          statusEnum.statusCode.HTTP_UNAUTHORIZED
        );
      }

      const role = await AdminRoleService.getRoleByRoleId(roleId);

      if (!role) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${adminMessagesEnum.ROLE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (role.status !== roleStatus.ACTIVE) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${adminMessagesEnum.ROLE_INACTIVE}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ROLE_INACTIVE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const existingAdmin = await AdminAuthService.getAdminByEmail(email);

      if (existingAdmin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${adminMessagesEnum.ADMIN_EMAIL_EXISTS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_EMAIL_EXISTS,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      // ! email stays unique across deleted admins too
      const deletedAdmin = await AdminAuthService.getDeletedAdminByEmail(email);

      if (deletedAdmin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${adminMessagesEnum.ADMIN_ALREADY_DELETED}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_ALREADY_DELETED,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      // & custom permissions replace the role's defaults; without them the role's set is copied
      let adminPermissions;

      if (permissions?.length) {
        await AdminRoleService.validateRolePermissionsArray(
          permissions,
          adminLabelEnum.INVITE_ADMIN
        );

        adminPermissions = permissions;
      } else {
        const rolePermissions = await AdminRoleService.getRolePermissions(
          role.roleId
        );
        adminPermissions = rolePermissions.map(row => ({
          resourceId: row.resourceId,
          actions: row.permissions,
        }));
      }

      const password = createTempPassword();
      const passwordHash = await bcrypt.hash(password, 10);

      session.startTransaction();

      const [admin] = await AdminAuth.create(
        [
          {
            adminId: createId("admin", 24),
            first_name,
            last_name,
            email: email.toLowerCase(),
            password: passwordHash,
            gender,
            role: role.role,
            roleId: role.roleId,
            status: adminStatus.PENDING,
            invitedBy: req.adminId,
            is_created_password: false,
            is_completed_profile: false,
          },
        ],
        { session }
      );

      if (adminPermissions.length > 0) {
        await AdminUserPermission.insertMany(
          adminPermissions.map(({ resourceId, actions }) => ({
            rolePermId: createPermId(),
            adminId: admin.adminId,
            roleId: role.roleId,
            role_type: role.role,
            resourceId,
            permissions: actions,
          })),
          { session }
        );
      }

      await session.commitTransaction();

      adminActivityTracking(
        req.adminId,
        adminOpCodes.INVITE_ADMIN,
        activityStatus.SUCCESS,
        adminName =>
          adminDescriptions.invite_admin(adminName, recipientFullName)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}-${adminMessagesEnum.ADMIN_INVITED_SUCCESSFULLY}`
      );

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      return res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: adminMessagesEnum.ADMIN_INVITED_SUCCESSFULLY,
        admin: adminObj,
        permissions: adminPermissions,
        // + no invite e-mail is sent, so the inviter passes this on to the new admin
        temporaryPassword: password,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Invite admin failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.INVITE_ADMIN}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.INVITE_ADMIN,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.invite_admin_failed(adminName, recipientFullName)
      );
      next(error);
    } finally {
      session.endSession();
    }
  },

  completeProfile: async (req, res, next) => {
    try {
      const { first_name, last_name, middle_name, phone_number, gender } =
        req.body;

      const admin = await AdminAuthService.getAdminByAdminId(req.adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.COMPLETE_PROFILE}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (admin.is_completed_profile) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.COMPLETE_PROFILE}-${adminMessagesEnum.PROFILE_ALREADY_COMPLETED}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.PROFILE_ALREADY_COMPLETED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin.first_name = first_name;
      admin.last_name = last_name;
      admin.middle_name = middle_name;
      admin.phone_number = phone_number;
      admin.gender = gender;
      admin.is_completed_profile = true;
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.COMPLETE_PROFILE,
        activityStatus.SUCCESS,
        adminDescriptions.completes_profile,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.COMPLETE_PROFILE}-${adminMessagesEnum.PROFILE_COMPLETED_SUCCESSFULLY}`
      );

      // ' super admins have every permission, so none are listed
      const adminPermissions = isSuperAdmin(admin)
        ? []
        : await AdminAuthService.getAdminPermissions(admin.adminId);

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.PROFILE_COMPLETED_SUCCESSFULLY,
        admin: { ...adminObj, permissions: adminPermissions },
      });
    } catch (error) {
      logger.error(
        `Complete profile failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.COMPLETE_PROFILE}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.COMPLETE_PROFILE,
        activityStatus.FAILED,
        adminDescriptions.completes_profile_failed
      );
      next(error);
    }
  },

  getMyProfile: async (req, res, next) => {
    try {
      const admin = await AdminAuthService.getAdminByAdminId(req.adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_MY_PROFILE}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ' super admins have every permission, so none are listed
      const adminPermissions = isSuperAdmin(admin)
        ? []
        : await AdminAuthService.getAdminPermissions(admin.adminId);

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_MY_PROFILE}-${adminMessagesEnum.PROFILE_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.PROFILE_FETCHED_SUCCESSFULLY,
        admin: { ...adminObj, permissions: adminPermissions },
      });
    } catch (error) {
      logger.error(
        `Get my profile failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_MY_PROFILE}`,
        error.message
      );
      next(error);
    }
  },

  getAllAdmins: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        AdminAuthService.getAllAdmins(),
        queryParams,
        {
          searchableFields: ["first_name", "last_name", "email"],
          filterAllowlist: ["status", "roleId"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const adminsCount = await AdminAuthService.countDocuments(filter);

      features.pagination(resultPerPage);
      const admins = await features.query;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_ADMINS}-${adminMessagesEnum.ADMINS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMINS_FETCHED_SUCCESSFULLY,
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
        `Get all admins failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ALL_ADMINS}`,
        error.message
      );
      next(error);
    }
  },

  getOneAdmin: async (req, res, next) => {
    try {
      const admin = await AdminAuthService.getAdminByAdminId(
        req.params.adminId
      );

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ADMIN}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ' super admins have every permission, so none are listed
      const adminPermissions = isSuperAdmin(admin)
        ? []
        : await AdminAuthService.getAdminPermissions(admin.adminId);

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ADMIN}-${adminMessagesEnum.ADMIN_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_FETCHED_SUCCESSFULLY,
        admin: { ...adminObj, permissions: adminPermissions },
      });
    } catch (error) {
      logger.error(
        `Get one admin failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ONE_ADMIN}`,
        error.message
      );
      next(error);
    }
  },

  editAdmin: async (req, res, next) => {
    const session = await mongoose.startSession();
    let admin;
    try {
      const { adminId } = req.params;
      const { email, roleId, permissions, ...details } = req.body;

      admin = await AdminAuthService.getAdminByAdminId(adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (email && email.toLowerCase() !== admin.email) {
        const existingAdmin = await AdminAuthService.getAdminByEmail(email);

        if (existingAdmin) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ADMIN_EMAIL_EXISTS}`
          );
          throw new ErrorResponse(
            adminMessagesEnum.ADMIN_EMAIL_EXISTS,
            statusEnum.statusCode.HTTP_CONFLICT
          );
        }

        // ! email stays unique across deleted admins too
        const deletedAdmin =
          await AdminAuthService.getDeletedAdminByEmail(email);

        if (deletedAdmin) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ADMIN_ALREADY_DELETED}`
          );
          throw new ErrorResponse(
            adminMessagesEnum.ADMIN_ALREADY_DELETED,
            statusEnum.statusCode.HTTP_CONFLICT
          );
        }

        admin.email = email.toLowerCase();
      }

      // > a new role must be active, and only a super admin can hand out super admin
      let role = null;
      if (roleId && roleId !== admin.roleId) {
        role = await AdminRoleService.getRoleByRoleId(roleId);

        if (!role) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ROLE_NOT_FOUND}`
          );
          throw new ErrorResponse(
            adminMessagesEnum.ROLE_NOT_FOUND,
            statusEnum.statusCode.HTTP_NOT_FOUND
          );
        }

        if (role.status !== roleStatus.ACTIVE) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ROLE_INACTIVE}`
          );
          throw new ErrorResponse(
            adminMessagesEnum.ROLE_INACTIVE,
            statusEnum.statusCode.HTTP_BAD_REQUEST
          );
        }

        if (role.role === adminRoleTypes.SUPER_ADMIN) {
          const currentAdmin = await AdminAuthService.getAdminByAdminId(
            req.adminId
          );

          if (!isSuperAdmin(currentAdmin)) {
            logger.warn(
              `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.SUPER_ADMIN_ROLE_NOT_ALLOWED}`
            );
            throw new ErrorResponse(
              adminMessagesEnum.SUPER_ADMIN_ROLE_NOT_ALLOWED,
              statusEnum.statusCode.HTTP_FORBIDDEN
            );
          }
        }

        admin.role = role.role;
        admin.roleId = role.roleId;
      }

      // ~ sent permissions replace the admin's own; a role change without them copies the new role's defaults
      let newPermissions = null;

      if (permissions?.length) {
        await AdminRoleService.validateRolePermissionsArray(
          permissions,
          adminLabelEnum.EDIT_ADMIN
        );

        newPermissions = permissions;
      } else if (permissions !== undefined || role) {
        const rolePermissions = await AdminRoleService.getRolePermissions(
          admin.roleId
        );
        newPermissions = rolePermissions.map(row => ({
          resourceId: row.resourceId,
          actions: row.permissions,
        }));
      }

      Object.entries(details).forEach(([field, value]) => {
        admin[field] = value;
      });

      session.startTransaction();
      await admin.save({ session });

      if (newPermissions) {
        await AdminAuthService.replaceAdminPermissions(
          admin,
          { roleId: admin.roleId, role: admin.role },
          newPermissions,
          createPermId,
          session
        );
      }

      await session.commitTransaction();

      adminActivityTracking(
        req.adminId,
        adminOpCodes.EDIT_PROFILE,
        activityStatus.SUCCESS,
        adminName => adminDescriptions.edit_admin(adminName, getFullName(admin))
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}-${adminMessagesEnum.ADMIN_UPDATED_SUCCESSFULLY}`
      );

      // ' super admins have every permission, so none are listed
      const adminPermissions = isSuperAdmin(admin)
        ? []
        : await AdminAuthService.getAdminPermissions(admin.adminId);

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_UPDATED_SUCCESSFULLY,
        admin: { ...adminObj, permissions: adminPermissions },
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Edit admin failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.EDIT_ADMIN}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.EDIT_PROFILE,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.edit_admin_failed(
            adminName,
            admin ? getFullName(admin) : req.params.adminId
          )
      );
      next(error);
    } finally {
      session.endSession();
    }
  },

  updateAdminStatus: async (req, res, next) => {
    let admin;
    try {
      const { adminId } = req.params;
      const { status } = req.body;

      if (adminId === req.adminId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ADMIN_STATUS}-${adminMessagesEnum.CANNOT_UPDATE_OWN_STATUS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.CANNOT_UPDATE_OWN_STATUS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin = await AdminAuthService.getAdminByAdminId(adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ADMIN_STATUS}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (admin.status === status) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ADMIN_STATUS}-${adminMessagesEnum.ADMIN_STATUS_UNCHANGED(status)}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_STATUS_UNCHANGED(status),
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin.status = status;
      // * a reactivated admin starts with a clean verification-request count
      if (status === adminStatus.ACTIVE) {
        admin.emailVerificationTokenCount = 0;
      }
      await admin.save();

      adminActivityTracking(
        req.adminId,
        adminOpCodes.UPDATE_ADMIN_STATUS,
        activityStatus.SUCCESS,
        adminName =>
          adminDescriptions.update_admin_status(
            adminName,
            getFullName(admin),
            status
          )
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ADMIN_STATUS}-${adminMessagesEnum.ADMIN_STATUS_UPDATED_SUCCESSFULLY}`
      );

      const adminObj = admin.toObject();
      delete adminObj.password;
      delete adminObj.passwordToken;
      delete adminObj.passwordTokenExpires;
      delete adminObj.emailVerificationToken;
      delete adminObj.emailVerificationTokenExpires;

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_STATUS_UPDATED_SUCCESSFULLY,
        admin: adminObj,
      });
    } catch (error) {
      logger.error(
        `Update admin status failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.UPDATE_ADMIN_STATUS}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.UPDATE_ADMIN_STATUS,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.update_admin_status_failed(
            adminName,
            admin ? getFullName(admin) : req.params.adminId,
            req.body?.status
          )
      );
      next(error);
    }
  },

  deleteAdmin: async (req, res, next) => {
    const session = await mongoose.startSession();
    let admin;
    try {
      const { adminId } = req.params;

      if (adminId === req.adminId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ADMIN}-${adminMessagesEnum.CANNOT_DELETE_SELF}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.CANNOT_DELETE_SELF,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin = await AdminAuthService.getAdminByAdminId(adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ADMIN}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      // ! activity logs are kept as the audit trail; only the account and its permissions go
      session.startTransaction();
      admin.isDeleted = true;
      admin.deletedAt = new Date();
      await admin.save({ session });
      await AdminAuthService.softDeleteAdminPermissions(admin.adminId, session);
      await session.commitTransaction();

      adminActivityTracking(
        req.adminId,
        adminOpCodes.DELETE_ADMIN,
        activityStatus.SUCCESS,
        adminName =>
          adminDescriptions.delete_admin(adminName, getFullName(admin))
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ADMIN}-${adminMessagesEnum.ADMIN_DELETED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_DELETED_SUCCESSFULLY,
      });
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error(
        `Delete admin failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.DELETE_ADMIN}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.DELETE_ADMIN,
        activityStatus.FAILED,
        adminName =>
          adminDescriptions.delete_admin_failed(
            adminName,
            admin ? getFullName(admin) : req.params.adminId
          )
      );
      next(error);
    } finally {
      session.endSession();
    }
  },
};
