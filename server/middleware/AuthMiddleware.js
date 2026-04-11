import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import ErrorResponse from "../utils/ErrorHandler.js";

dotenv.config({ quiet: true });

export const Auth = async (req, res, next) => {
  try {
    const bearerTokenFromHeader = req.header("Authorization");

    if (!bearerTokenFromHeader) {
      return next(new ErrorResponse("Unauthorized", 401));
    }
    
    const token = bearerTokenFromHeader.replace("Bearer ", "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new ErrorResponse("Invalid token", 401));
      }
      const id = decoded._id ?? decoded.userId;
      if (!id) {
        return next(new ErrorResponse("Cannot find user", 401));
      }
      req.userId = id;
      next();
    });
  } catch (error) {
    console.error(error);
    next(new ErrorResponse("Internal server error", 500));
  }
};

export const AuthAdmin = async (req, res, next) => {
  try {
    const bearerTokenFromHeader = req.header("Authorization");
    if (!bearerTokenFromHeader) {
      return next(new ErrorResponse("Unauthorized", 401));
    }

    const token = bearerTokenFromHeader.replace("Bearer ", "");
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new ErrorResponse("Invalid token", 401));
      }
      req.adminId = decoded.adminId;
      next();
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorResponse("Internal server error", 500));
  }
};

export const AllowedRoles = (...roles) => {
  return (req, res, next) => {
    const { savedAdmin } = req;

    if (!roles.includes(savedAdmin.role)) {
      return next(
        new ErrorResponse(
          `Role ${savedAdmin.role} is not allowed to access this resource`,
          401
        )
      );
    }

    next();
  };
};
