import AdminDashboardService, {
  dashboardMetricKeys,
} from "../../service/admin/admin-dashboard.service.js";
import logger from "../../logger/logger.js";
import {
  defaultTrendCount,
  getPeriodRange,
  getTrendBuckets,
} from "../../utils/dateRange.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  statusEnum,
} from "../../enums/index.js";
import { percentChange, toAnchor } from "../../utils/helper.js";

export const AdminDashboardController = {
  getSummary: async (req, res, next) => {
    try {
      const period = req.query.period ?? "week";
      const { range, previousRange } = getPeriodRange(
        period,
        toAnchor(req.query.date)
      );

      const [current, previous, totals] = await Promise.all([
        AdminDashboardService.getMetrics(range.from, range.to),
        AdminDashboardService.getMetrics(previousRange.from, previousRange.to),
        AdminDashboardService.getAllTimeTotals(),
      ]);

      const metrics = Object.fromEntries(
        dashboardMetricKeys.map(key => [
          key,
          {
            current: current[key],
            previous: previous[key],
            change: percentChange(current[key], previous[key]),
          },
        ])
      );

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_SUMMARY}-${adminMessagesEnum.DASHBOARD_SUMMARY_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_SUMMARY_FETCHED_SUCCESSFULLY,
        period,
        range,
        previousRange,
        metrics,
        totals,
      });
    } catch (error) {
      logger.error(
        `Get dashboard summary failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_SUMMARY}`,
        error.message
      );
      next(error);
    }
  },

  getTrends: async (req, res, next) => {
    try {
      const interval = req.query.interval ?? "day";
      const count = Number(req.query.count) || defaultTrendCount[interval];
      const { buckets, from, to } = getTrendBuckets(
        interval,
        count,
        toAnchor(req.query.date)
      );

      const byBucket = await AdminDashboardService.getTrendMetrics(
        interval,
        from,
        to
      );

      // * every bucket is listed, with zeros where nothing happened
      const series = buckets.map(start => {
        const values = byBucket[start.toISOString()] ?? {};
        return {
          periodStart: start,
          ...Object.fromEntries(
            dashboardMetricKeys.map(key => [key, values[key] ?? 0])
          ),
        };
      });

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TRENDS}-${adminMessagesEnum.DASHBOARD_TRENDS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_TRENDS_FETCHED_SUCCESSFULLY,
        interval,
        count,
        range: { from, to },
        series,
      });
    } catch (error) {
      logger.error(
        `Get dashboard trends failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TRENDS}`,
        error.message
      );
      next(error);
    }
  },

  getBreakdown: async (req, res, next) => {
    try {
      const { period, date } = req.query;
      const range = period
        ? getPeriodRange(period, toAnchor(date)).range
        : undefined;

      const breakdown = await AdminDashboardService.getBreakdown(range);

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_BREAKDOWN}-${adminMessagesEnum.DASHBOARD_BREAKDOWN_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_BREAKDOWN_FETCHED_SUCCESSFULLY,
        period: period ?? "all",
        range: range ?? null,
        ...breakdown,
      });
    } catch (error) {
      logger.error(
        `Get dashboard breakdown failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_BREAKDOWN}`,
        error.message
      );
      next(error);
    }
  },

  getTopBlogs: async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const blogs = await AdminDashboardService.getTopBlogs(limit);

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOP_BLOGS}-${adminMessagesEnum.DASHBOARD_TOP_BLOGS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_TOP_BLOGS_FETCHED_SUCCESSFULLY,
        blogs,
      });
    } catch (error) {
      logger.error(
        `Get top blogs failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOP_BLOGS}`,
        error.message
      );
      next(error);
    }
  },

  getTopReviews: async (req, res, next) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const reviews = await AdminDashboardService.getTopReviews(limit);

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOP_REVIEWS}-${adminMessagesEnum.DASHBOARD_TOP_REVIEWS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_TOP_REVIEWS_FETCHED_SUCCESSFULLY,
        reviews,
      });
    } catch (error) {
      logger.error(
        `Get top reviews failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOP_REVIEWS}`,
        error.message
      );
      next(error);
    }
  },

  // # all-time totals for users, admins, blogs, comments, messages and visits
  getTotals: async (req, res, next) => {
    try {
      const totals = await AdminDashboardService.getAllTimeTotals();

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOTALS}-${adminMessagesEnum.DASHBOARD_TOTALS_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.DASHBOARD_TOTALS_FETCHED_SUCCESSFULLY,
        totals,
      });
    } catch (error) {
      logger.error(
        `Get dashboard totals failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_DASHBOARD_TOTALS}`,
        error.message
      );
      next(error);
    }
  },
};
