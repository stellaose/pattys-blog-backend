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

  // # CONTACT
  CREATE_CONTACT_MESSAGE: "ContactController::createContactMessage",
  GET_ALL_CONTACT_MESSAGES: "ContactController::getAllContactMessages",
  REQUIRE_ROLE_MIDDLEWARE: "AuthMiddleware::requireRole",
};

export const adminLabelEnum = {
  // + AUTH
  ADMIN_LOGIN: "AdminAuthController::login",
  ADMIN_VERIFY_LOGIN: "AdminAuthController::verifyLogin",
  ADMIN_CREATE_PASSWORD: "AdminAuthController::createPassword",
  ADMIN_FORGOT_PASSWORD: "AdminAuthController::forgotPassword",
  ADMIN_VERIFY_FORGOT_PASSWORD: "AdminAuthController::verifyForgotPassword",
  ADMIN_RESET_PASSWORD: "AdminAuthController::resetPassword",
  ADMIN_CHANGE_PASSWORD: "AdminAuthController::changePassword",
  ADMIN_LOGOUT: "AdminAuthController::logout",

  // + ADMINS
  INVITE_ADMIN: "AdminController::inviteAdmin",
  COMPLETE_PROFILE: "AdminController::completeProfile",
  GET_MY_PROFILE: "AdminController::getMyProfile",
  GET_ALL_ADMINS: "AdminController::getAllAdmins",
  GET_ONE_ADMIN: "AdminController::getOneAdmin",
  EDIT_ADMIN: "AdminController::editAdmin",
  UPDATE_ADMIN_STATUS: "AdminController::updateAdminStatus",
  DELETE_ADMIN: "AdminController::deleteAdmin",

  // # RESOURCES
  CREATE_RESOURCE: "AdminResourceController::createResource",
  GET_ALL_RESOURCES: "AdminResourceController::getAllResources",
  GET_ONE_RESOURCE: "AdminResourceController::getOneResource",
  EDIT_RESOURCE: "AdminResourceController::editResource",
  DELETE_RESOURCE: "AdminResourceController::deleteResource",

  // ? ROLES
  CREATE_ROLE: "AdminRoleController::createRole",
  GET_ALL_ROLES: "AdminRoleController::getAllRoles",
  GET_ONE_ROLE: "AdminRoleController::getOneRole",
  EDIT_ROLE: "AdminRoleController::editRole",
  UPDATE_ROLE_STATUS: "AdminRoleController::updateRoleStatus",
  DELETE_ROLE: "AdminRoleController::deleteRole",
  SET_ROLE_PERMISSIONS: "AdminRoleController::setRolePermissions",
  GET_ADMINS_BY_ROLE: "AdminRoleController::getAdminsByRole",

  // % DASHBOARD
  GET_DASHBOARD_SUMMARY: "AdminDashboardController::getSummary",
  GET_DASHBOARD_TRENDS: "AdminDashboardController::getTrends",
  GET_DASHBOARD_BREAKDOWN: "AdminDashboardController::getBreakdown",
  GET_DASHBOARD_TOP_BLOGS: "AdminDashboardController::getTopBlogs",
  GET_DASHBOARD_TOP_REVIEWS: "AdminDashboardController::getTopReviews",
  GET_DASHBOARD_TOTALS: "AdminDashboardController::getTotals",

  // % BLOGS
  ADMIN_GET_BLOG: "AdminBlogController::getBlog",

  // % ACTIVITY
  GET_USER_ACTIVITY: "AdminActivityController::getUserActivity",
  GET_ADMIN_ACTIVITY: "AdminActivityController::getAdminActivity",

  // % CONTENT LISTS
  ADMIN_GET_BLOGS: "AdminContentController::getBlogs",
  ADMIN_GET_BLOGGERS: "AdminContentController::getBloggers",
  ADMIN_GET_COMMENTS: "AdminContentController::getComments",
  ADMIN_GET_CONTACTS: "AdminContentController::getContacts",
};
