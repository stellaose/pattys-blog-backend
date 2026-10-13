import dayjs from "dayjs";

export const labelEnum = {
  CURRENT_TIME_STAMP: `${dayjs().format("DD-MMM-YYYY, HH:mm:ss")}`,
  USER_SIGNUP: "AuthController::signup",
  USER_VERIFICATION: "AuthController::verifyEmail",
  USER_FORGET_PASSWORD: "AuthController::forgetPassword",
  USER_RESET_PASSWORD: "AuthController::resetPassword",
  USER_VERIFY_FORGOT_PASSWORD: "AuthController::verifyForgetPassword",
  USER_CHANGE_PASSWORD: "AuthController::changePassword",
  RESEND_OTP: "AuthController::resendOtp",
  USER_LOGIN: "AuthController::login",
  USER_LOGOUT: "AuthController::logout",

  // < USER
  USER_UPDATE_PROFILE: "UserController::updateUser",
  USER_GET_PROFILE: "UserController::getMyProfile",
  USER_DELETE_PROFILE: "UserController::deleteUser",
  GET_USER_PROFILE: "UserController::getUserProfile",

  // ^ Auth Middleware
  AUTH_MIDDLEWARE: "AuthMiddleware::auth",
  AUTH_ADMIN_MIDDLEWARE: "AuthMiddleware::authAdmin",
  ALLOWED_ROLES_MIDDLEWARE: "AuthMiddleware::allowedRoles",

  // % BLOGS
  CREATE_BLOG: "BlogController::createBlog",
  GET_ALL_BLOGS: "BlogController::getAllBlogs",
  GET_MY_BLOGS: "BlogController::getMyBlogs",
  GET_ONE_BLOG: "BlogController::getOneBlog",
  EDIT_BLOG: "BlogController::editBlog",
  LIKE_DISLIKE_BLOG: "BlogController::likeDislikeBlog",
  DELETE_BLOG: "BlogController::deleteBlog",

  // - FLAGGED BLOGS
  GET_MY_FLAGGED_BLOGS: "FlaggedController::getMyFlaggedBlog",
  FLAG_BLOG: "FlaggedController::flagBlog",
  DELETE_FLAGGED_BLOG: "FlaggedController::deleteFlagged",

  // ; REVIEWS
  CREATE_REVIEW: "ReviewController::createReview",
  GET_ALL_REVIEWS: "ReviewController::getAllReviews",
  GET_ONE_REVIEW: "ReviewController::getOneReview",
  EDIT_REVIEW: "ReviewController::editReview",
  DELETE_REVIEW: "ReviewController::deleteReview",
  GET_REVIEWS_BY_BLOG_ID: "ReviewController::getReviewsByBlogId",
};
