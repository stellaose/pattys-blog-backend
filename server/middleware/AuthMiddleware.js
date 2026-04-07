// import config from "../models/index.js";
// import { UserModel } from "../models/user.model.js";
// import { HTTPError } from "../response";
// import { AuthTokens } from "../utils/token.js";
// import { EUserType } from "../enums/userEnum.js";

// const { verifyToken } = AuthTokens;

// class AuthMiddleware {
//   async hasToken(req, res, next) {
//     const bearerHeader = req.headers.authorization;

//     let errorMessage = "Unauthorized!";
//     const action = "logout";

//     try {
//       if (bearerHeader) {
//         const token = bearerHeader.split(" ")[1];

//         // - COMPARE TOKEN EXPIRATION
//         const tokenValues = {
//           token,
//           secret: config.jwtSecret,
//         };

//         const { success, error, decoded } = verifyToken(tokenValues);
//         if (!success) {
//           console.log(error.name);
//           errorMessage = "Invalid Token";
//           if (error.name === "TokenExpiredError")
//             errorMessage = "Expired Token";

//           const _data = {
//             message: errorMessage,
//             field: error.name,
//             error: true,
//             action,
//           };
//           throw HTTPError.Unauthorized(res, _data);
//         }

//         const user = await UserModel.findById(decoded?._id);
//         if (!user) {
//           errorMessage = "User does not exist!";

//           const _data = {
//             message: errorMessage,
//             field: error.name,
//             error: true,
//             action,
//           };
//           throw HTTPError.Unauthorized(res, _data);
//         }

//         req.user = user;
//         return next();
//       }

//       const _data = {
//         message: errorMessage,
//         error: true,
//         action,
//       };
//       throw HTTPError.Unauthorized(res, _data);
//     } catch (e) {
//       next(e);
//     }
//   }

//   async mustBeAdmin(req, res, next) {
//     const { user } = req;
//     console.log("Usertype found", user?.role);
//     console.log(EUserType, "EUserType");

//     try {
//       if (user?.userType !== EUserType.SuperAdmin) {
//         throw HTTPError.Unauthorized(res, {
//           message: "Only Admin allowed to access this endpoint",
//         });
//       }

//       next();
//     } catch (e) {
//       next(e);
//     }
//   }

//   async mustBeStaff(req, res, next) {
//     const { user } = req;

//     try {
//       if (user.userType !== EUserType.staff) {
//         throw HTTPError.Unauthorized(
//           res,
//           "Only Staff allowed to access this endpoint"
//         );
//       }
//       next();
//     } catch (e) {
//       next(e);
//     }
//   }
// }

// export default new AuthMiddleware();

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
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        return next(new ErrorResponse("Invalid token", 401));
      }
      req.userId = decoded.userid;
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
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        return next(new ErrorResponse("Invalid token", 401));
      }
      req.adminId = decoded.adminid;
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
