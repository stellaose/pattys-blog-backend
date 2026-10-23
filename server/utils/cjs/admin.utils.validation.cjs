/* eslint-disable no-undef */
const Joi = require("joi");

// ? shared by the admin list endpoints: search, sort and one page at a time
const listQueryKeys = {
  keyword: Joi.string().trim().max(100).allow("").optional(),
  sort: Joi.string()
    .pattern(/^-?[A-Za-z_]+(,-?[A-Za-z_]+)*$/)
    .optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
};

module.exports = {
  resourceParams: Joi.object().keys({
    resourceId: Joi.string().required().messages({
      "any.required": "Resource ID is required",
      "string.empty": "Resource ID is required",
    }),
  }),
  createResource: Joi.object().keys({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500).allow("").optional(),
  }),
  editResource: Joi.object()
    .keys({
      name: Joi.string().trim().max(100).optional(),
      description: Joi.string().trim().max(500).allow("").optional(),
    })
    .min(1),

  adminLogin: Joi.object().keys({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required(),
  }),
  adminVerifyOtp: Joi.object().keys({
    email: Joi.string().trim().email().required(),
    code: Joi.number().integer().required(),
  }),
  adminCreatePassword: Joi.object().keys({
    password: Joi.string().min(8).required(),
  }),
  adminForgotPassword: Joi.object().keys({
    email: Joi.string().trim().email().required(),
  }),
  adminResetPassword: Joi.object().keys({
    passwordResetToken: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
  adminChangePassword: Joi.object().keys({
    old_password: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),
  inviteAdmin: Joi.object().keys({
    first_name: Joi.string().trim().max(100).required(),
    last_name: Joi.string().trim().max(100).required(),
    email: Joi.string().trim().email().required(),
    gender: Joi.string().valid("male", "female").required(),
    roleId: Joi.string().required(),
    // ~ optional: replaces the role's default permissions for this admin
    permissions: Joi.array()
      .items(
        Joi.object().keys({
          resourceId: Joi.string().required(),
          actions: Joi.array()
            .items(Joi.string().valid("create", "read", "update", "delete"))
            .unique()
            .min(1)
            .required(),
        })
      )
      .unique("resourceId")
      .optional(),
  }),
  adminParams: Joi.object().keys({
    adminId: Joi.string().required().messages({
      "any.required": "Admin ID is required",
      "string.empty": "Admin ID is required",
    }),
  }),
  completeAdminProfile: Joi.object().keys({
    first_name: Joi.string().trim().max(100).required(),
    last_name: Joi.string().trim().max(100).required(),
    middle_name: Joi.string().trim().max(100).allow("").optional(),
    phone_number: Joi.string().trim().min(7).max(20).required(),
    gender: Joi.string().valid("male", "female").required(),
  }),
  editAdmin: Joi.object()
    .keys({
      first_name: Joi.string().trim().max(100).optional(),
      last_name: Joi.string().trim().max(100).optional(),
      middle_name: Joi.string().trim().max(100).allow("").optional(),
      phone_number: Joi.string().trim().min(7).max(20).optional(),
      email: Joi.string().trim().email().optional(),
      gender: Joi.string().valid("male", "female").optional(),
      roleId: Joi.string().optional(),
      // ~ full replace of this admin's own permissions
      permissions: Joi.array()
        .items(
          Joi.object().keys({
            resourceId: Joi.string().required(),
            actions: Joi.array()
              .items(Joi.string().valid("create", "read", "update", "delete"))
              .unique()
              .min(1)
              .required(),
          })
        )
        .unique("resourceId")
        .optional(),
    })
    .min(1),
  updateAdminStatus: Joi.object().keys({
    status: Joi.string()
      .valid("active", "inactive", "suspended", "blacklisted", "watchlisted")
      .required(),
  }),
  roleParams: Joi.object().keys({
    roleId: Joi.string().required().messages({
      "any.required": "Role ID is required",
      "string.empty": "Role ID is required",
    }),
  }),
  createRole: Joi.object().keys({
    name: Joi.string().trim().max(100).required(),
    status: Joi.string().valid("active", "inactive").optional(),
  }),
  editRole: Joi.object().keys({
    name: Joi.string().trim().max(100).required(),
  }),
  updateRoleStatus: Joi.object().keys({
    status: Joi.string().valid("active", "inactive").required(),
  }),
  setRolePermissions: Joi.object().keys({
    permissions: Joi.array()
      .items(
        Joi.object().keys({
          resourceId: Joi.string().required(),
          actions: Joi.array()
            .items(Joi.string().valid("create", "read", "update", "delete"))
            .unique()
            .min(1)
            .required(),
        })
      )
      .unique("resourceId")
      .min(1)
      .required(),
  }),

  // ? `date` picks which period to report (defaults to now); future dates are rejected
  dashboardSummaryQuery: Joi.object().keys({
    period: Joi.string().valid("day", "week", "month", "year").optional(),
    date: Joi.date().iso().max("now").optional(),
  }),
  dashboardTrendsQuery: Joi.object().keys({
    interval: Joi.string().valid("day", "week", "month", "year").optional(),
    count: Joi.number()
      .integer()
      .min(1)
      .when("interval", {
        switch: [
          { is: "week", then: Joi.number().max(52) },
          { is: "month", then: Joi.number().max(24) },
          { is: "year", then: Joi.number().max(10) },
        ],
        otherwise: Joi.number().max(90),
      })
      .optional(),
    date: Joi.date().iso().max("now").optional(),
  }),
  // ? no period means all time; with one, only records created in that period count
  dashboardBreakdownQuery: Joi.object().keys({
    period: Joi.string().valid("day", "week", "month", "year").optional(),
    date: Joi.date().iso().max("now").optional(),
  }),
  dashboardTopQuery: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(50).optional(),
  }),
  adminBlogParams: Joi.object().keys({
    blogId: Joi.string().trim().required(),
  }),
  adminBlogsQuery: Joi.object().keys({
    ...listQueryKeys,
    category: Joi.string()
      .valid(
        "news",
        "politics",
        "entertainment",
        "sports",
        "business",
        "education",
        "other"
      )
      .optional(),
    isFlagged: Joi.boolean().optional(),
  }),
  adminBloggersQuery: Joi.object().keys({
    ...listQueryKeys,
    isEmailVerified: Joi.boolean().optional(),
    gender: Joi.string().valid("male", "female").optional(),
  }),
  adminCommentsQuery: Joi.object().keys({
    ...listQueryKeys,
    blogId: Joi.string().trim().optional(),
  }),
  adminContactsQuery: Joi.object().keys({
    ...listQueryKeys,
    topic: Joi.string().trim().max(100).optional(),
  }),
  activityLogQuery: Joi.object().keys({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    status: Joi.string().valid("success", "failed").optional(),
  }),

  // ? list filters shared by GET /role and GET /role/:roleId/admins; dates are YYYY-MM-DD, inclusive
  rolesQuery: Joi.object().keys({
    search: Joi.string().trim().max(100).allow("").optional(),
    status: Joi.string().valid("active", "inactive").optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
  adminsByRoleQuery: Joi.object().keys({
    search: Joi.string().trim().max(100).allow("").optional(),
    status: Joi.string()
      .valid(
        "pending",
        "active",
        "inactive",
        "suspended",
        "blacklisted",
        "watchlisted"
      )
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),
};
