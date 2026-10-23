import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../utils/ErrorHandler.js";
import { AdminAuthService } from "../../service/admin/admin-auth.service.js";
import tokenService from "../../utils/token.js";
import logger from "../../logger/logger.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  messagesEnum,
  statusEnum,
} from "../../enums/index.js";
import { getFullName } from "../../utils/helper.js";
import {
  adminActivityTracking,
  adminDescriptions,
} from "../../lib/admin/index.js";

dotenv.config({ quiet: true });

// + Email sending is disabled so others can test: every OTP is this fixed code.
const TEST_OTP = 654321;
const OTP_MINUTES = 15;

const { adminOpCodes, activityStatus, adminStatus } = statusEnum;

// ! these statuses can't sign in; pending admins can, so they can create a password
const BLOCKED_STATUSES = [
  adminStatus.INACTIVE,
  adminStatus.SUSPENDED,
  adminStatus.BLACKLISTED,
];

export const AdminAuthController = {
  login: async (req, res, next) => {
    let admin;
    try {
      const { email, password } = req.body;

      admin = await AdminAuthService.getAdminByEmail(email);
      console.log(admin);
      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGIN}-${adminMessagesEnum.INVALID_CREDENTIALS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.INVALID_CREDENTIALS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      console.log(isMatch)

      if (!isMatch) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGIN}-${adminMessagesEnum.INVALID_CREDENTIALS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.INVALID_CREDENTIALS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (BLOCKED_STATUSES.includes(admin.status)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGIN}-${adminMessagesEnum.ACCOUNT_NOT_ACTIVE(admin.status)}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ACCOUNT_NOT_ACTIVE(admin.status),
          statusEnum.statusCode.HTTP_FORBIDDEN
        );
      }

      admin.emailVerificationToken = TEST_OTP;
      admin.emailVerificationTokenExpires = new Date(
        Date.now() + OTP_MINUTES * 60 * 1000
      );
      admin.emailVerificationTokenCount =
        Number(admin.emailVerificationTokenCount ?? 0) + 1;
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.LOGIN_REQUEST,
        activityStatus.SUCCESS,
        adminDescriptions.login_request,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGIN}-${adminMessagesEnum.LOGIN_OTP_SENT}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.LOGIN_OTP_SENT,
        admin: {
          adminId: admin.adminId,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          // + no e-mail is sent, so the code comes back here
          otp: admin.emailVerificationToken,
        },
      });
    } catch (error) {
      logger.error(
        `Admin login failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGIN}`,
        error.message
      );
      adminActivityTracking(
        admin?.adminId,
        adminOpCodes.LOGIN_REQUEST,
        activityStatus.FAILED,
        adminDescriptions.login_request_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  verifyLogin: async (req, res, next) => {
    let admin;
    try {
      const { email, code } = req.body;

      admin = await AdminAuthService.getAdminByEmail(email);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}-${adminMessagesEnum.INVALID_CREDENTIALS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.INVALID_CREDENTIALS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!admin.emailVerificationToken) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}-${messagesEnum.VERIFICATION_CODE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_NOT_FOUND,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (Number(admin.emailVerificationToken) !== Number(code)) {
        admin.inValidEmailVerificationCount =
          Number(admin.inValidEmailVerificationCount ?? 0) + 1;
        await admin.save();

        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}-${messagesEnum.INVALID_VERIFICATION_CODE}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_VERIFICATION_CODE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (admin.emailVerificationTokenExpires?.getTime() < Date.now()) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}-${messagesEnum.VERIFICATION_CODE_EXPIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_EXPIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      // * the code is single use
      admin.emailVerificationToken = undefined;
      admin.emailVerificationTokenExpires = undefined;
      admin.inValidEmailVerificationCount = 0;
      await admin.save();

      const token = tokenService.generateAdminJwtToken(admin);
      const refreshToken = tokenService.generateAdminRefreshJwtToken(admin);

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.VERIFY_LOGIN_OTP,
        activityStatus.SUCCESS,
        adminDescriptions.verify_login_otp,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}-${adminMessagesEnum.LOGIN_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.LOGIN_SUCCESSFUL,
        token,
        refreshToken,
        admin: {
          adminId: admin.adminId,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          role: admin.role,
          status: admin.status,
          is_created_password: admin.is_created_password,
          is_completed_profile: admin.is_completed_profile,
        },
      });
    } catch (error) {
      logger.error(
        `Admin verify login failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_LOGIN}`,
        error.message
      );
      adminActivityTracking(
        admin?.adminId,
        adminOpCodes.VERIFY_LOGIN_OTP,
        activityStatus.FAILED,
        adminDescriptions.verify_login_otp_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  createPassword: async (req, res, next) => {
    let admin;
    try {
      const { password } = req.body;

      admin = await AdminAuthService.getAdminByAdminId(req.adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CREATE_PASSWORD}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (admin.is_created_password) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CREATE_PASSWORD}-${adminMessagesEnum.PASSWORD_ALREADY_CREATED}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.PASSWORD_ALREADY_CREATED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      // ! the temporary password from the invite can't be reused
      const sameAsOld = await bcrypt.compare(password, admin.password);

      if (sameAsOld) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CREATE_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.NEW_PASSWORD_SAME_AS_OLD,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin.password = await bcrypt.hash(password, 10);
      admin.is_created_password = true;
      admin.isEmailVerified = true;
      // > an invited admin becomes active once they own their password
      if (admin.status === adminStatus.PENDING) {
        admin.status = adminStatus.ACTIVE;
      }
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.CREATE_PASSWORD,
        activityStatus.SUCCESS,
        adminDescriptions.new_password,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CREATE_PASSWORD}-${adminMessagesEnum.PASSWORD_CREATED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.PASSWORD_CREATED_SUCCESSFULLY,
        admin: {
          adminId: admin.adminId,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          status: admin.status,
          is_created_password: admin.is_created_password,
        },
      });
    } catch (error) {
      logger.error(
        `Admin create password failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CREATE_PASSWORD}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.CREATE_PASSWORD,
        activityStatus.FAILED,
        adminDescriptions.new_password_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  forgotPassword: async (req, res, next) => {
    let admin;
    try {
      const { email } = req.body;

      admin = await AdminAuthService.getAdminByEmail(email);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_FORGOT_PASSWORD}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      admin.passwordToken = TEST_OTP;
      admin.passwordTokenExpires = new Date(
        Date.now() + OTP_MINUTES * 60 * 1000
      );
      admin.isForgetPasswordOtp = true;
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.FORGOT_PASSWORD,
        activityStatus.SUCCESS,
        adminDescriptions.forgot_password,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_FORGOT_PASSWORD}-${adminMessagesEnum.RESET_OTP_SENT}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.RESET_OTP_SENT,
        admin: {
          adminId: admin.adminId,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          // + no e-mail is sent, so the code comes back here
          otp: admin.passwordToken,
        },
      });
    } catch (error) {
      logger.error(
        `Admin forgot password failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_FORGOT_PASSWORD}`,
        error.message
      );
      adminActivityTracking(
        admin?.adminId,
        adminOpCodes.FORGOT_PASSWORD,
        activityStatus.FAILED,
        adminDescriptions.forgot_password_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  verifyForgotPassword: async (req, res, next) => {
    let admin;
    try {
      const { email, code } = req.body;

      admin = await AdminAuthService.getAdminByEmail(email);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (!admin.passwordToken) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_CODE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_NOT_FOUND,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (Number(admin.passwordToken) !== Number(code)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}-${messagesEnum.INVALID_VERIFICATION_CODE}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_VERIFICATION_CODE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (admin.passwordTokenExpires?.getTime() < Date.now()) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_CODE_EXPIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_EXPIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      // * the code is single use; the reset token below replaces it
      admin.passwordToken = undefined;
      admin.passwordTokenExpires = undefined;
      admin.isForgetPasswordOtp = false;
      await admin.save();

      const passwordResetToken =
        tokenService.generateAdminResetPasswordToken(admin);

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.VERIFY_RESET_PASSWORD_OTP,
        activityStatus.SUCCESS,
        adminDescriptions.verify_reset_pass_otp,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.VERIFICATION_SUCCESSFUL,
        passwordResetToken,
      });
    } catch (error) {
      logger.error(
        `Admin verify forgot password failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_VERIFY_FORGOT_PASSWORD}`,
        error.message
      );
      adminActivityTracking(
        admin?.adminId,
        adminOpCodes.VERIFY_RESET_PASSWORD_OTP,
        activityStatus.FAILED,
        adminDescriptions.verify_reset_pass_otp_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    let admin;
    try {
      const { passwordResetToken, password } = req.body;

      const { success, decoded } = tokenService.verifyToken(
        passwordResetToken,
        process.env.EMAIL_SECRET
      );

      if (!success || decoded?.purpose !== "admin-reset-password") {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_RESET_PASSWORD}-${adminMessagesEnum.INVALID_RESET_TOKEN}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.INVALID_RESET_TOKEN,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin = await AdminAuthService.getAdminByAdminId(decoded.adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_RESET_PASSWORD}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const sameAsOld = await bcrypt.compare(password, admin.password);

      if (sameAsOld) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_RESET_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.NEW_PASSWORD_SAME_AS_OLD,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin.password = await bcrypt.hash(password, 10);
      admin.is_created_password = true;
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.RESET_PASSWORD,
        activityStatus.SUCCESS,
        adminDescriptions.reset_password,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_RESET_PASSWORD}-${messagesEnum.PASSWORD_RESET_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.PASSWORD_RESET_SUCCESSFUL,
      });
    } catch (error) {
      logger.error(
        `Admin reset password failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_RESET_PASSWORD}`,
        error.message
      );
      adminActivityTracking(
        admin?.adminId,
        adminOpCodes.RESET_PASSWORD,
        activityStatus.FAILED,
        adminDescriptions.reset_password_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    let admin;
    try {
      const { old_password, password } = req.body;

      admin = await AdminAuthService.getAdminByAdminId(req.adminId);

      if (!admin) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CHANGE_PASSWORD}-${adminMessagesEnum.ADMIN_NOT_FOUND}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.ADMIN_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const isMatch = await bcrypt.compare(old_password, admin.password);

      if (!isMatch) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CHANGE_PASSWORD}-${adminMessagesEnum.INVALID_CREDENTIALS}`
        );
        throw new ErrorResponse(
          adminMessagesEnum.INVALID_CREDENTIALS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const sameAsOld = await bcrypt.compare(password, admin.password);

      if (sameAsOld) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CHANGE_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.NEW_PASSWORD_SAME_AS_OLD,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      admin.password = await bcrypt.hash(password, 10);
      await admin.save();

      adminActivityTracking(
        admin.adminId,
        adminOpCodes.CHANGE_PASSWORD,
        activityStatus.SUCCESS,
        adminDescriptions.change_password,
        getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CHANGE_PASSWORD}-${messagesEnum.PASSWORD_CHANGED_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.PASSWORD_CHANGED_SUCCESSFUL,
      });
    } catch (error) {
      logger.error(
        `Admin change password failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_CHANGE_PASSWORD}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.CHANGE_PASSWORD,
        activityStatus.FAILED,
        adminDescriptions.change_password_failed,
        admin && getFullName(admin)
      );
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      // ! tokens are stateless JWTs, so logging out only clears any pending login code
      const admin = await AdminAuthService.getAdminByAdminId(req.adminId);

      if (admin) {
        admin.emailVerificationToken = undefined;
        admin.emailVerificationTokenExpires = undefined;
        await admin.save();
      }

      adminActivityTracking(
        req.adminId,
        adminOpCodes.LOGOUT,
        activityStatus.SUCCESS,
        adminDescriptions.logout,
        admin && getFullName(admin)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGOUT}-${messagesEnum.LOGOUT_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.LOGOUT_SUCCESSFUL,
      });
    } catch (error) {
      logger.error(
        `Admin logout failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.ADMIN_LOGOUT}`,
        error.message
      );
      adminActivityTracking(
        req.adminId,
        adminOpCodes.LOGOUT,
        activityStatus.FAILED,
        adminDescriptions.logout_failed
      );
      next(error);
    }
  },
};
