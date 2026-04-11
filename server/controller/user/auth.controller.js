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
        return next(new ErrorResponse("Valid email is required", 400));
      }
      if (!password || password?.length < 6) {
        return next(
          new ErrorResponse("Password is required (min 8 chars)", 400)
        );
      }
      if (!user_name) {
        return next(new ErrorResponse("Username is required", 400));
      }
      if (!phone_number) {
        return next(new ErrorResponse("Phone number is required", 400));
      }

      const existingEmail = await Auth.findOne({
        email: email.toLowerCase(),
      });
      if (existingEmail) {
        return next(new ErrorResponse("Email already exists", 400));
      }

      const existingUsername = await Auth.findOne({
        user_name,
      });
      if (existingUsername) {
        return next(new ErrorResponse("Username already exists", 400));
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
          created_at: user?.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  verifyEmail: async (req, res, next) => {
    try {
      const { email, code } = req.body;
      if (!email || !validateEmail(email)) {
        return next(new ErrorResponse("Valid email is required", 400));
      }

      const normalized = String(code);
      if (!normalized) {
        return next(
          new ErrorResponse("A 6-digit verification code is required", 400)
        );
      }

      const user = await Auth.findOne({ email: email.toLowerCase() });
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: "Email already verified",
        });
      }

      if (
        user.emailVerificationToken !== normalized ||
        (user.emailVerificationTokenExpires &&
          user.emailVerificationTokenExpires.getTime() < Date.now())
      ) {
        return next(
          new ErrorResponse("Invalid or expired verification code", 400)
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
          created_at: user?.created_at,
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

  // changePassword: async (req, res, next) => {
  //   try {
  //     const { password, newPassword } = req.body;
  //     const { userId } = req.params;

  //     if (!password) {
  //       return next(new ErrorResponse("Password is required", 400));
  //     }
  //     if (!newPassword) {
  //       return next(new ErrorResponse("New password is required", 400));
  //     }

  //     const user = await Auth.findById(req.userId);
  //     if (!user) return next(new ErrorResponse("User not found", 404));

  //     const paramMatches =
  //       String(user._id) === String(userId) || user.userId === userId;
  //     if (!paramMatches) {
  //       return next(new ErrorResponse("Forbidden", 403));
  //     }

  //     const currentOk = await bcrypt.compare(password, user.password);
  //     if (!currentOk) {
  //       return next(new ErrorResponse("Invalid password", 400));
  //     }

  //     const sameAsOld = await bcrypt.compare(newPassword, user.password);
  //     if (sameAsOld) {
  //       return next(new ErrorResponse("New password must be different", 400));
  //     }

  //     const salt = bcrypt.genSaltSync(10);
  //     user.password = bcrypt.hashSync(newPassword, salt);
  //     await user.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Password changed successfully",
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },
  
  changePassword: async (req, res, next) => {
    try {
      const { password, newPassword } = req.body;
      const { userId } = req.params;
  
      if (!password) return next(new ErrorResponse("Password is required", 400));
      if (!newPassword) return next(new ErrorResponse("New password is required", 400));
  
      // ✅ Find user by _id from token (req.userId is the MongoDB _id)
      const user = await Auth.findById(req.userId);
      if (!user) return next(new ErrorResponse("User not found", 404));
  
      const paramMatches =
        String(user._id) === String(userId) || user.userId === userId;
      if (!paramMatches) return next(new ErrorResponse("Forbidden", 403));
  
      const currentOk = await bcrypt.compare(password, user.password);
      if (!currentOk) return next(new ErrorResponse("Invalid password", 400));
  
      const sameAsOld = await bcrypt.compare(newPassword, user.password);
      if (sameAsOld) return next(new ErrorResponse("New password must be different", 400));
  
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
};
