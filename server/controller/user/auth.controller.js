import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../utils/ErrorHandler.js";
import validateEmail from "../../utils/Validation.js";
import { Auth } from "../../models/user/auth.model.js";
import { AuthService } from "../../service/user/auth.service.js";
import tokenService from "../../utils/token.js";
import logger from "../../logger/logger.js";
import { labelEnum, messagesEnum, statusEnum } from "../../enums/index.js";
import { createId, getFullName } from "../../utils/helper.js";
import { userActivityTracking, descriptions } from "../../lib/user/index.js";

dotenv.config({ quiet: true });

// + Email sending is disabled so others can test: every OTP is this fixed code.
const TEST_OTP = 123456;

export const AuthController = {
  signup: async (req, res, next) => {
    let user;
    try {
      const {
        first_name,
        last_name,
        user_name,
        email,
        password,
        phone_number,
        gender,
        bio,
      } = req.body;

      if (!email || !validateEmail(email)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.EMAIL_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!password || password?.length < 6) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.PASSWORD_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!user_name) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.USERNAME_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.USERNAME_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!phone_number) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.PHONE_NUMBER_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.PHONE_NUMBER_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const existingEmail = await AuthService.getUserByEmail(email);

      if (existingEmail) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.EMAIL_EXISTS}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_EXISTS,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      const existingUsername = await AuthService.getUserByUsername(user_name);

      if (existingUsername) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.USERNAME_EXISTS}`
        );
        throw new ErrorResponse(
          messagesEnum.USERNAME_EXISTS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      user = await Auth.create({
        userId: createId("user", 24),
        first_name,
        last_name,
        user_name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone_number,
        gender,
        bio,
        role: "user",
        isEmailVerified: false,
        createdAt: Date.now(),
        updatedAt: null,
      });

      user.emailVerificationToken = TEST_OTP;
      user.emailVerificationTokenExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await user.save();
      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.emailVerificationToken;
      delete userObj.emailVerificationTokenExpires;

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.SIGNUP,
        statusEnum.activityStatus.SUCCESS,
        descriptions.signup,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.USER_CREATED}`
      );
      res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: messagesEnum.SIGNUP_SUCCESSFUL,
        user: userObj,
      });
    } catch (error) {
      logger.error(
        `Signup failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.SIGNUP,
        statusEnum.activityStatus.FAILED,
        descriptions.signup_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  verifyEmail: async (req, res, next) => {
    let user;
    try {
      const { email, code } = req.body;

      if (!email || !validateEmail(email)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.EMAIL_REQUIRED}`
        );
        throw new ErrorResponse(messagesEnum.EMAIL_REQUIRED, 400);
      }

      if (!code) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.VERIFICATION_CODE_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user = await AuthService.getUserByEmail(email);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (user.isEmailVerified) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.EMAIL_ALREADY_VERIFIED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_ALREADY_VERIFIED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (Number(user.emailVerificationToken) !== Number(code)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.INVALID_VERIFICATION_CODE}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_VERIFICATION_CODE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (
        user.emailVerificationTokenExpires &&
        user.emailVerificationTokenExpires.getTime() < Date.now()
      ) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.VERIFICATION_CODE_EXPIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_EXPIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpires = undefined;
      await user.save();

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.passwordToken;
      delete userObj.passwordTokenExpires;

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.VERIFY_EMAIL,
        statusEnum.activityStatus.SUCCESS,
        descriptions.verify_email,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.EMAIL_VERIFIED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.EMAIL_VERIFIED_SUCCESSFULLY,
        user: userObj,
      });
    } catch (error) {
      logger.error(
        `Email verification failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.VERIFY_EMAIL,
        statusEnum.activityStatus.FAILED,
        descriptions.verify_email_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  resendOtp: async (req, res, next) => {
    let user;
    try {
      const { userId } = req.params;
      const { isSignupPasswordOtp, isForgotPasswordOtp } = req.body;

      if (!userId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.USER_ID_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!isSignupPasswordOtp && !isForgotPasswordOtp) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.REQUEST_BODY_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.REQUEST_BODY_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user = await AuthService.getUserByUserId(userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (!user.emailVerificationToken && !user.passwordToken) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.VERIFICATION_CODE_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (isSignupPasswordOtp) {
        if (user.isEmailVerified) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.EMAIL_ALREADY_VERIFIED}`
          );
          throw new ErrorResponse(
            messagesEnum.EMAIL_ALREADY_VERIFIED,
            statusEnum.statusCode.HTTP_BAD_REQUEST
          );
        }

        user.emailVerificationToken = TEST_OTP;
        user.emailVerificationTokenExpires = new Date(
          Date.now() + 10 * 60 * 1000
        );
      } else {
        if (!user.isEmailVerified) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.EMAIL_NOT_VERIFIED}`
          );
          throw new ErrorResponse(
            messagesEnum.EMAIL_NOT_VERIFIED,
            statusEnum.statusCode.HTTP_BAD_REQUEST
          );
        }

        user.passwordToken = TEST_OTP;
        user.passwordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      }

      await user.save();
      const userObj = {
        first_name: user?.first_name,
        last_name: user?.last_name,
        user_name: user?.user_name,
        email: user?.email,
        phone_number: user?.phone_number,
      };

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.RESEND_OTP,
        statusEnum.activityStatus.SUCCESS,
        descriptions.resend_otp,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}-${messagesEnum.EMAIL_SENT_SUCCESSFULLY}`
      );
      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: "Check your email for a 6-digit code to verify your account.",
        user: userObj,
      });
    } catch (error) {
      logger.error(
        `Resend otp failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.RESEND_OTP}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.RESEND_OTP,
        statusEnum.activityStatus.FAILED,
        descriptions.resend_otp_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  login: async (req, res, next) => {
    let user;
    try {
      const { email, password } = req.body;

      if (!email || !validateEmail(email)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.EMAIL_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }
      if (!password) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.PASSWORD_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user = await AuthService.getUserByEmail(email);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.USER_NOT_FOUND}`
        );

        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (!user.isEmailVerified) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.EMAIL_NOT_VERIFIED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_NOT_VERIFIED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.INVALID_PASSWORD}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_PASSWORD,
          statusEnum.statusCode.HTTP_UNAUTHORIZED
        );
      }

      const token = tokenService.generateJwtToken(user);
      const refreshToken = tokenService.generateRefreshJwtToken(user);

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.passwordToken;
      delete userObj.passwordTokenExpires;

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.LOGIN,
        statusEnum.activityStatus.SUCCESS,
        descriptions.login,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}-${messagesEnum.LOGIN_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: "Login successful",
        user: userObj,
        token,
        refreshToken,
      });
    } catch (error) {
      logger.error(
        `Login failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGIN}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.LOGIN,
        statusEnum.activityStatus.FAILED,
        descriptions.login_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  forgetPassword: async (req, res, next) => {
    let user;
    try {
      const { email } = req.body;

      if (!email || !validateEmail(email)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_FORGET_PASSWORD}-${messagesEnum.EMAIL_REQUIRED}`
        );
        throw new ErrorResponse(messagesEnum.EMAIL_REQUIRED, 400);
      }

      user = await AuthService.getUserByEmail(email);

      if (!user) {
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (!user.isEmailVerified) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_FORGET_PASSWORD}-${messagesEnum.EMAIL_NOT_VERIFIED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_NOT_VERIFIED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user.passwordToken = TEST_OTP;
      user.passwordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

      await user.save();

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.FORGOT_PASSWORD,
        statusEnum.activityStatus.SUCCESS,
        descriptions.forgot_password,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_FORGET_PASSWORD}-${messagesEnum.EMAIL_SENT_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.EMAIL_SENT_SUCCESSFULLY,
        data: {
          userId: user?.userId,
          first_name: user?.first_name,
          last_name: user?.last_name,
          user_name: user?.user_name,
          email: user?.email,
          code: user?.passwordToken,
        },
      });
    } catch (error) {
      logger.error(
        `Forget password failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_FORGET_PASSWORD}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.FORGOT_PASSWORD,
        statusEnum.activityStatus.FAILED,
        descriptions.forgot_password_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  verifyForgetPassword: async (req, res, next) => {
    let user;
    try {
      const { userId, code } = req.body;

      if (!userId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.USER_ID_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!code) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_CODE_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }
      user = await AuthService.getUserByUserId(userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      if (Number(user.passwordToken) !== Number(code)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.INVALID_VERIFICATION_CODE}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_VERIFICATION_CODE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (user.passwordTokenExpires.getTime() < new Date()) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_CODE_EXPIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_EXPIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.VERIFY_FORGOT_PASSWORD,
        statusEnum.activityStatus.SUCCESS,
        descriptions.verify_forgot_password,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.VERIFICATION_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.VERIFICATION_SUCCESSFUL,
        user: {
          userId: user?.userId,
          first_name: user?.first_name,
          last_name: user?.last_name,
          user_name: user?.user_name,
          email: user?.email,
        },
      });
    } catch (error) {
      logger.error(
        `Verify forget password failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.VERIFY_FORGOT_PASSWORD,
        statusEnum.activityStatus.FAILED,
        descriptions.verify_forgot_password_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    let user;
    try {
      const { userId, password } = req.body;

      if (!userId) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFY_FORGOT_PASSWORD}-${messagesEnum.USER_ID_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_ID_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!password) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.PASSWORD_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user = await AuthService.getUserByUserId(userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const existingPassword = await bcrypt.compare(password, user.password);

      if (existingPassword) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_CANNOT_BE_SAME,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!user.passwordToken) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.VERIFICATION_CODE_NOT_FOUND}`
        );
        return next(
          new ErrorResponse(
            messagesEnum.VERIFICATION_CODE_NOT_FOUND,
            statusEnum.statusCode.HTTP_NOT_FOUND
          )
        );
      }

      if (user.passwordTokenExpires.getTime() < Date.now()) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.VERIFICATION_CODE_EXPIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_EXPIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_CANNOT_BE_SAME,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(password, salt);
      user.passwordToken = null;
      user.passwordTokenExpires = null;
      user.updatedAt = new Date();

      await user.save();

      const userObj = {
        userId: user?.userId,
        first_name: user?.first_name,
        last_name: user?.last_name,
        user_name: user?.user_name,
        email: user?.email,
      };

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.RESET_PASSWORD,
        statusEnum.activityStatus.SUCCESS,
        descriptions.reset_password,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}-${messagesEnum.PASSWORD_RESET_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.PASSWORD_RESET_SUCCESSFUL,
        user: userObj,
      });
    } catch (error) {
      logger.error(
        `Reset password failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_RESET_PASSWORD}`,
        error.message
      );
      userActivityTracking(
        user?.userId,
        statusEnum.opCodes.RESET_PASSWORD,
        statusEnum.activityStatus.FAILED,
        descriptions.reset_password_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    let user;
    try {
      const { password, newPassword } = req.body;
      const { userId } = req.params;

      if (!password) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.PASSWORD_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.PASSWORD_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (!newPassword) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.NEW_PASSWORD_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.NEW_PASSWORD_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }
      user = await AuthService.getUserByUserId(req.userId);

      if (!user) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.USER_NOT_FOUND}`
        );
        throw new ErrorResponse(
          messagesEnum.USER_NOT_FOUND,
          statusEnum.statusCode.HTTP_NOT_FOUND
        );
      }

      const paramMatches =
        String(user._id) === String(userId) || user.userId === userId;

      if (!paramMatches) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.FORBIDDEN}`
        );
        throw new ErrorResponse(
          messagesEnum.FORBIDDEN,
          statusEnum.statusCode.HTTP_FORBIDDEN
        );
      }

      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.NEW_PASSWORD_SAME_AS_OLD}`
        );
        throw new ErrorResponse(
          messagesEnum.NEW_PASSWORD_SAME_AS_OLD,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(newPassword, salt);
      user.updatedAt = new Date();

      await user.save();

      userActivityTracking(
        user.userId,
        statusEnum.opCodes.CHANGE_PASSWORD,
        statusEnum.activityStatus.SUCCESS,
        descriptions.change_password,
        getFullName(user)
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}-${messagesEnum.PASSWORD_CHANGE_SUCCESSFUL}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.PASSWORD_CHANGE_SUCCESSFUL,
      });
    } catch (error) {
      logger.error(
        `Change password failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_CHANGE_PASSWORD}`,
        error.message
      );
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.CHANGE_PASSWORD,
        statusEnum.activityStatus.FAILED,
        descriptions.change_password_failed,
        user && getFullName(user)
      );
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      res.clearCookie("token");
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.LOGOUT,
        statusEnum.activityStatus.SUCCESS,
        descriptions.logout
      );
      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGOUT}-${messagesEnum.LOGOUT_SUCCESSFUL}`
      );
      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.LOGOUT_SUCCESSFUL,
      });
    } catch (error) {
      logger.error(
        `Logout failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_LOGOUT}`,
        error.message
      );
      userActivityTracking(
        req.userId,
        statusEnum.opCodes.LOGOUT,
        statusEnum.activityStatus.FAILED,
        descriptions.logout_failed
      );
      next(error);
    }
  },
};
