import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import ErrorResponse from "../utils/ErrorHandler.js";
import { messagesEnum, labelEnum, statusEnum } from "../enums/index.js";
import logger from "../logger/logger.js";

dotenv.config({ quiet: true });

const AuthMiddleWare = {
  auth: async (req, res, next) => {
    try {
      const bearerTokenFromHeader = req.header("Authorization");

      if (!bearerTokenFromHeader) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_MIDDLEWARE}-${messagesEnum.UNAUTHORIZED}`
        );
        throw new ErrorResponse(
          messagesEnum.UNAUTHORIZED,
          statusEnum.statusCode.HTTP_UNAUTHORIZED
        );
      }

      const token = bearerTokenFromHeader.replace("Bearer ", "");
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_MIDDLEWARE}-${messagesEnum.INVALID_TOKEN}`
          );
          throw new ErrorResponse(
            messagesEnum.INVALID_TOKEN,
            statusEnum.statusCode.HTTP_UNAUTHORIZED
          );
        }

        req.userId = decoded.userId;
        next();
      });
    } catch (error) {
      logger.error(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_MIDDLEWARE}-${messagesEnum.INTERNAL_SERVER_ERROR}`,
        error.message
      );
      next(error);
    }
  },

  authAdmin: async (req, res, next) => {
    try {
      const bearerTokenFromHeader = req.header("Authorization");
      if (!bearerTokenFromHeader) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_ADMIN_MIDDLEWARE}-${messagesEnum.UNAUTHORIZED}`
        );
        throw new ErrorResponse(
          messagesEnum.UNAUTHORIZED,
          statusEnum.statusCode.HTTP_UNAUTHORIZED
        );
      }

      const token = bearerTokenFromHeader.replace("Bearer ", "");
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          logger.warn(
            `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_ADMIN_MIDDLEWARE}-${messagesEnum.INVALID_TOKEN}`
          );
          throw new ErrorResponse(
            messagesEnum.INVALID_TOKEN,
            statusEnum.statusCode.HTTP_UNAUTHORIZED
          );
        }
        req.adminId = decoded.adminId;
        next();
      });
    } catch (error) {
      logger.error(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.AUTH_ADMIN_MIDDLEWARE}-${messagesEnum.INTERNAL_SERVER_ERROR}`,
        error.message
      );
      return next(error);
    }
  },

  allowedRoles: (...roles) => {
    return (req, res, next) => {
      const { savedAdmin } = req;

      if (!roles.includes(savedAdmin.role)) {
        logger.warn(
          `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.ALLOWED_ROLES_MIDDLEWARE}-${messagesEnum.UNAUTHORIZED}`
        );
        throw new ErrorResponse(
          messagesEnum.NO_RESOURCE_ENTRY(savedAdmin.role),
          statusEnum.statusCode.HTTP_UNAUTHORIZED
        );
      }

      next();
    };
  },
};

export default AuthMiddleWare;
