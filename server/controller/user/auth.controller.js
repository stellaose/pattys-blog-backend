import crypto from "crypto";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../utils/ErrorHandler.js";
import validateEmail from "../../utils/Validation.js";
import { sendEmail } from "../../utils/mailer.js";
import { Auth } from "../../models/auth.model.js";
import { nanoid } from "nanoid";
import tokenService from "../../utils/token.js";
import { signUpMail, forgetPasswordMail } from "../../utils/emailMessages.js";
import logger from "../../logger/logger.js";
import { labelEnum, messagesEnum, statusEnum } from "../../enums/index.js";

dotenv.config({ quiet: true });

export const AuthController = {
  signup: async (req, res, next) => {
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
          messagesEnum.PHONE_NUMBER_REQUIRED,
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

      const existingEmail = await Auth.findOne({
        email: email.toLowerCase(),
      });
      if (existingEmail) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.EMAIL_EXISTS}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_EXISTS,
          statusEnum.statusCode.HTTP_CONFLICT
        );
      }

      const existingUsername = await Auth.findOne({
        user_name,
      });
      if (existingUsername) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}-${messagesEnum.USERNAME_EXISTS}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_EXISTS,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      const user = await Auth.create({
        userId: `user-${nanoid(24).replaceAll("_", "").replaceAll("-", "")}`,
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
      });

      const verificationCode = crypto
        .randomInt(0, 1_000_000)
        .toString()
        .padStart(6, "0");
      user.emailVerificationToken = verificationCode;
      user.emailVerificationTokenExpires = new Date(
        Date.now() + 10 * 60 * 1000
      );

      const mail = signUpMail(user?.first_name, verificationCode);
      const sentMail = await sendEmail({
        to: user?.email,
        subject: mail?.subject,
        html: mail?.html,
        text: mail?.text,
      });

      if (sentMail) {
        await user.save();
      }

      res.status(201).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message:
          "Signup successful. Check your email for a 6-digit code to verify your account.",
        user: {
          id: user?._id,
          userId: user?.userId,
          code: user?.emailVerificationToken,
          first_name: user?.first_name,
          last_name: user?.last_name,
          user_name: user?.user_name,
          email: user?.email,
          phone_number: user?.phone_number,
          gender: user?.gender,
          bio: user?.bio,
          role: user?.role,
          isEmailVerified: user?.isEmailVerified,
          createdAt: user?.createdAt,
        },
      });
    } catch (error) {
      logger.error(
        `Signup failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_SIGNUP}`,
        error.message
      );
      next(error);
    }
  },

  verifyEmail: async (req, res, next) => {
    try {
      const { email, code } = req.body;

      if (!email || !validateEmail(email)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.EMAIL_REQUIRED}`
        );
        throw new ErrorResponse("Valid email is required", 400);
      }

      const normalized = String(code);
      if (!normalized) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.VERIFICATION_CODE_REQUIRED}`
        );
        throw new ErrorResponse(
          messagesEnum.VERIFICATION_CODE_REQUIRED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      const user = await Auth.findOne({ email: email.toLowerCase() });
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (user.isEmailVerified) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.EMAIL_ALREADY_VERIFIED}`
        );
        throw new ErrorResponse(
          messagesEnum.EMAIL_ALREADY_VERIFIED,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      if (
        user.emailVerificationToken !== normalized ||
        (user.emailVerificationTokenExpires &&
          user.emailVerificationTokenExpires.getTime() < Date.now())
      ) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}-${messagesEnum.INVALID_VERIFICATION_CODE}`
        );
        throw new ErrorResponse(
          messagesEnum.INVALID_VERIFICATION_CODE,
          statusEnum.statusCode.HTTP_BAD_REQUEST
        );
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpires = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      logger.error(
        `Email verification failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.USER_VERIFICATION}`,
        error.message
      );
      next(error);
    }
  },

  resendOtp: async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { isSignupPasswordOtp } = req.body;

      const user = await Auth.findOne({ userId });
      if (!user) return next(new ErrorResponse("User not found", 404));

      let mail;
      const verificationCode = crypto
        .randomInt(0, 1_000_000)
        .toString()
        .padStart(6, "0");

      if (isSignupPasswordOtp) {
        if (user.isEmailVerified) {
          return next(
            new ErrorResponse("This e-mail has already been verified", 400)
          );
        }

        user.emailVerificationToken = verificationCode;
        user.emailVerificationTokenExpires = new Date(
          Date.now() + 10 * 60 * 1000
        );

        mail = signUpMail(user?.first_name, verificationCode);
      } else {
        if (!user.isEmailVerified) {
          return next(
            new ErrorResponse(
              "This e-mail has not been verified. Please verify your account",
              400
            )
          );
        }

        user.passwordToken = verificationCode;
        user.passwordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
        mail = forgetPasswordMail(user?.first_name, verificationCode);
      }

      const sentMail = await sendEmail({
        to: user?.email,
        subject: mail?.subject,
        html: mail?.html,
        text: mail?.text,
      });

      if (sentMail) {
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Check your email for a 6-digit code to verify your account.",
        user: {
          id: user?._id,
          userId: user?.userId,
          code: user?.emailVerificationToken,
          first_name: user?.first_name,
          last_name: user?.last_name,
          user_name: user?.user_name,
          email: user?.email,
          phone_number: user?.phone_number,
          gender: user?.gender,
          bio: user?.bio,
          role: user?.role,
          isEmailVerified: user?.isEmailVerified,
          createdAt: user?.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !validateEmail(email)) {
        return next(new ErrorResponse("Valid email is required", 400));
      }
      if (!password) {
        return next(new ErrorResponse("Password is required", 400));
      }

      const user = await Auth.findOne({ email: email.toLowerCase() });
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (!user.isEmailVerified) {
        return next(new ErrorResponse("Email not verified", 400));
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return next(new ErrorResponse("Invalid credentials", 401));
      }

      const token = tokenService.generateJwtToken(user);
      const refreshToken = tokenService.generateRefreshJwtToken(user);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user?._id,
          userId: user?.userId,
          first_name: user?.first_name,
          last_name: user?.last_name,
          user_name: user?.user_name,
          email: user?.email,
          phone_number: user?.phone_number,
          gender: user?.gender,
          bio: user?.bio,
          isEmailVerified: user?.isEmailVerified,
          createdAt: user?.createdAt,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  },

  forgetPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email || !validateEmail(email)) {
        return next(new ErrorResponse("Valid email is required", 400));
      }

      const user = await Auth.findOne({ email: email.toLowerCase() });
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (!user.isEmailVerified) {
        return next(new ErrorResponse("Email not verified", 400));
      }

      const verificationCode = crypto
        .randomInt(0, 1_000_000)
        .toString()
        .padStart(6, "0");

      user.passwordToken = verificationCode;
      user.passwordTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const mail = forgetPasswordMail(user?.first_name, verificationCode);

      const sentMail = await sendEmail({
        to: user?.email,
        subject: mail?.subject,
        html: mail?.html,
        text: mail?.text,
      });

      if (sentMail) {
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        code: user?.passwordToken,
      });
    } catch (error) {
      next(error);
    }
  },

  verifyForgetPassword: async (req, res, next) => {
    try {
      const { email, code } = req.body;
      if (!email || !validateEmail(email)) {
        return next(new ErrorResponse("Valid email is required", 400));
      }
      if (!code) {
        return next(new ErrorResponse("Verification code is required", 400));
      }
      const user = await Auth.findOne({ email: email.toLowerCase() });

      if (!user) return next(new ErrorResponse("User not found", 404));

      if (!user.passwordToken)
        return next(new ErrorResponse("Code not found", 404));

      if (user.passwordToken !== code)
        return next(new ErrorResponse("Invalid code", 400));

      if (user.passwordTokenExpires.getTime() < Date.now())
        return next(new ErrorResponse("Code expired", 400));

      return res.status(200).json({
        success: true,
        message: "Code verified successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !validateEmail(email)) {
        return next(new ErrorResponse("Valid email is required", 400));
      }
      if (!password) {
        return next(new ErrorResponse("Password is required", 400));
      }

      const user = await Auth.findOne({ email: email.toLowerCase() });
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (!user.passwordToken)
        return next(new ErrorResponse("Code not found", 404));

      if (user.passwordTokenExpires.getTime() < Date.now())
        return next(new ErrorResponse("Code expired", 400));

      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(password, salt);
      user.passwordToken = null;
      user.passwordTokenExpires = null;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { password, newPassword } = req.body;
      const { userId } = req.params;

      if (!password)
        return next(new ErrorResponse("Password is required", 400));
      if (!newPassword)
        return next(new ErrorResponse("New password is required", 400));

      const user = await Auth.findById(req.userId);
      if (!user) return next(new ErrorResponse("User not found", 404));

      const paramMatches =
        String(user._id) === String(userId) || user.userId === userId;
      if (!paramMatches) return next(new ErrorResponse("Forbidden", 403));

      const currentOk = await bcrypt.compare(password, user.password);
      if (!currentOk) return next(new ErrorResponse("Invalid password", 400));

      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld)
        return next(new ErrorResponse("New password must be different", 400));

      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(newPassword, salt);
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  getMyProfile: async (req, res, next) => {
    try {
      const user = await Auth.findOne({ userId: req.userId });

      return res.status(200).json({
        success: true,
        message: "User found successfully",
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req, res, next) => {
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

      const updatedDetails = {
        first_name,
        last_name,
        user_name,
        email,
        password,
        phone_number,
        gender,
        bio,
      };
      const user = await Auth.findOne({ userId: req.userId });
      const updatedUser = await Auth.findOneAndUpdate(
        { userId: req.userId },
        updatedDetails,
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};
