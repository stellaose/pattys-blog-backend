/* eslint-disable no-undef */
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const signToken = (
  payload,
  secret,
  expires = process.env.REFRESH_JWT_EXPIRES_IN
) => {
  return jwt.sign(payload, secret, {
    algorithm: process.env.JWT_ALGORITHM || "HS256",
    expiresIn: expires,
  });
};

const tokenService = {
  generateJwtToken: user =>
    signToken(
      { _id: user._id, userId: user.userId, email: user.email },
      process.env.JWT_SECRET
    ),

  generateRefreshJwtToken: user =>
    signToken(
      {
        _id: user._id,
        userId: user.userId,
        email: user.email,
        version: user.tokenVersion,
      },
      process.env.REFRESH_JWT_SECRET
    ),

  generateEmailToken: user =>
    signToken(
      {
        _id: user._id,
        userId: user.userId,
        email: user.email,
      },
      process.env.EMAIL_SECRET,
      "1h"
    ),

  // + admin tokens carry adminId, which AuthMiddleware.authAdmin reads
  generateAdminJwtToken: admin =>
    signToken(
      { _id: admin._id, adminId: admin.adminId, email: admin.email },
      process.env.JWT_SECRET,
      process.env.JWT_EXPIRES_IN
    ),

  generateAdminRefreshJwtToken: admin =>
    signToken(
      { _id: admin._id, adminId: admin.adminId, email: admin.email },
      process.env.REFRESH_JWT_SECRET
    ),

  // ! signed with EMAIL_SECRET so it can never pass authAdmin as a login token
  generateAdminResetPasswordToken: admin =>
    signToken(
      { adminId: admin.adminId, purpose: "admin-reset-password" },
      process.env.EMAIL_SECRET,
      "15m"
    ),

  verifyToken: (token, secret) => {
    try {
      const decoded = jwt.verify(token, secret);
      return { success: true, decoded };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default tokenService;
