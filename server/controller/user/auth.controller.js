import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../utils/ErrorHandler.js";
import validateEmail from "../../utils/Validation.js";
import tokenService from "../../utils/token.js";
import { sendEmail } from "../../utils/mailer.js";
import { Auth } from "../../models/auth.model.js";
import { nanoid } from "nanoid";
import { signUpMail } from "../../utils/emailMessages.js";

dotenv.config({ quiet: true });

const baseUrl = () =>
  process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3003}`;

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
      
      const existingEmail= await Auth.findOne({
        email: email.toLowerCase()
      });
      if (existingEmail) {
        return next(new ErrorResponse("Email already exists", 400));
      }
      
      const existingUsername= await Auth.findOne({
        user_name
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

      const token = tokenService.generateEmailToken(user);
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpires = new Date(
        Date.now() + 60 * 60 * 1000
      );
      await user.save();

      const verifyUrl = `${baseUrl()}/api/user/verify-email?token=${encodeURIComponent(
        token
      )}`;
      

      const mail = signUpMail(user?.first_name, verifyUrl);
      await sendEmail({
        to: user?.email,
        subject: mail?.subject,
        html: mail?.html,
        text: mail?.text,
      });

      res.status(201).json({
        success: true,
        message:
          "Signup successful. Please check your email to verify your account.",
        user: {
          id: user?._id,
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
      const { token } = req.query;
      if (!token) return next(new ErrorResponse("Token is required", 400));

      const { success, decoded, error } = tokenService.verifyToken(
        String(token),
        process.env.EMAIL_SECRET
      );
      if (!success)
        return next(new ErrorResponse(error || "Invalid token", 400));

      const user = await Auth.findById(decoded._id);
      if (!user) return next(new ErrorResponse("User not found", 404));

      if (user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: "Email already verified",
        });
      }

      if (
        user.emailVerificationToken !== String(token) ||
        (user.emailVerificationTokenExpires &&
          user.emailVerificationTokenExpires.getTime() < Date.now())
      ) {
        return next(new ErrorResponse("Verification token expired", 400));
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
};
