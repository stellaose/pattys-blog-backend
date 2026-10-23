import { createRequire } from "module";
const require = createRequire(import.meta.url);

const adminValidation = require("./cjs/admin.utils.validation.cjs");

export default adminValidation;

export const {
  adminLogin,
  adminVerifyOtp,
  adminCreatePassword,
  adminForgotPassword,
  adminResetPassword,
  adminChangePassword,
  inviteAdmin,
  adminParams,
  completeAdminProfile,
  editAdmin,
  updateAdminStatus,
  resourceParams,
  createResource,
  editResource,
  roleParams,
  createRole,
  editRole,
  updateRoleStatus,
  setRolePermissions,
  dashboardSummaryQuery,
  dashboardTrendsQuery,
  dashboardBreakdownQuery,
  dashboardTopQuery,
  adminBlogParams,
  activityLogQuery,
  adminBlogsQuery,
  adminBloggersQuery,
  adminCommentsQuery,
  adminContactsQuery,
  rolesQuery,
  adminsByRoleQuery,
} = adminValidation;
