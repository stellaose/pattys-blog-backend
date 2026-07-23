import dayjs from "dayjs";

export const labelEnum = {
  CURRENT_TIME_STAMP: `${dayjs().format("DD-MMM-YYYY, HH:mm:ss")}`,
  USER_SIGNUP: "AuthController::signup",
  USER_VERIFICATION: "AuthController::verifyEmail",
  USER_FORGET_PASSWORD: "AuthController::forgetPassword",
  USER_RESET_PASSWORD: "AuthController::resetPassword",
  USER_VERIFY_FORGOT_PASSWORD: "AuthController::verifyForgetPassword",
  USER_CHANGE_PASSWORD: "AuthController::changePassword",
  USER_UPDATE_PROFILE: "AuthController::updateUser",
  USER_GET_PROFILE: "AuthController::getMyProfile",

  RESEND_OTP: "AuthController::resendOtp",
  USER_LOGIN: "AuthController::login",
  USER_SIGNUP: "AuthController::signup",

  // ^ Auth Middleware
  AUTH_MIDDLEWARE: "AuthMiddleware::auth",
  AUTH_ADMIN_MIDDLEWARE: "AuthMiddleware::authAdmin",
  ALLOWED_ROLES_MIDDLEWARE: "AuthMiddleware::allowedRoles",

  // % BLOGS
  CREATE_BLOG: "BlogController::createPost",
  GET_ALL_BLOGS: "BlogController::getAllBlogs",
  GET_MY_BLOGS: "BlogController::getMyBlogs",
  GET_ONE_BLOG: "BlogController::getOneBlog",
  EDIT_BLOG: "BlogController::editPost",
  LIKE_DISLIKE_BLOG: "BlogController::likeDislikePost",
  DELETE_BLOG: "BlogController::deletePost",

  // % FLAGGED BLOGS
  GET_MY_FLAGGED_BLOGS: "FlaggedController::getMyFlaggedPost",
  FLAG_BLOG: "FlaggedController::flagPost",
  DELETE_FLAGGED_BLOG: "FlaggedController::deleteFlagged",
};
