import { Router } from "express";
import { AdminDashboardController } from "../../controller/admin/admin-dashboard.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import { processJoiValidation } from "../../utils/utils.validation.js";
import {
  dashboardSummaryQuery,
  dashboardTrendsQuery,
  dashboardBreakdownQuery,
  dashboardTopQuery,
} from "../../utils/admin.utils.validation.js";

const router = Router();

router.get(
  "/summary",
  processJoiValidation(dashboardSummaryQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminDashboardController.getSummary
);

router.get(
  "/trends",
  processJoiValidation(dashboardTrendsQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminDashboardController.getTrends
);

router.get(
  "/breakdown",
  processJoiValidation(dashboardBreakdownQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminDashboardController.getBreakdown
);

router.get(
  "/top-blogs",
  processJoiValidation(dashboardTopQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminDashboardController.getTopBlogs
);

router.get(
  "/top-reviews",
  processJoiValidation(dashboardTopQuery, "query"),
  AuthMiddleware.authAdmin,
  AdminDashboardController.getTopReviews
);

// ? all-time totals only: no period filter, so no query validation
router.get(
  "/totals",
  AuthMiddleware.authAdmin,
  AdminDashboardController.getTotals
);

export default router;
