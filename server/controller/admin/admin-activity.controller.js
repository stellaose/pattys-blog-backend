import { UserActivityLog } from "../../models/user/user-activity-log.model.js";
import { AdminActivityLog } from "../../models/admin/admin-activity-log.model.js";
import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import { AuthService } from "../../service/user/auth.service.js";
import logger from "../../logger/logger.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  statusEnum,
} from "../../enums/index.js";

const LOG_FIELDS =
  "logId activity_type description activity_status createdAt -_id";

// # newest first, one page at a time, optionally only successes or failures
const pageOf = async (Model, ownerField, query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const filter = query.status ? { activity_status: query.status } : {};

  const [logs, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(`${ownerField} ${LOG_FIELDS}`)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const AdminActivityController = {
  getUserActivity: async (req, res, next) => {
    try {
      const { logs, pagination } = await pageOf(
        UserActivityLog,
        "userId",
        req.query
      );
      const users = await AuthService.getAuthorDetailsByUserIds(
        logs.map(log => log.userId)
      );

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_USER_ACTIVITY}-${adminMessagesEnum.USER_ACTIVITY_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.USER_ACTIVITY_FETCHED_SUCCESSFULLY,
        logs: logs.map(log => ({
          ...log,
          userDetails: users.get(log.userId) ?? null,
        })),
        pagination,
      });
    } catch (error) {
      logger.error(
        `Get user activity failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_USER_ACTIVITY}`,
        error.message
      );
      next(error);
    }
  },

  getAdminActivity: async (req, res, next) => {
    try {
      const { logs, pagination } = await pageOf(
        AdminActivityLog,
        "adminId",
        req.query
      );
      const admins = await AdminAuth.find({
        adminId: { $in: [...new Set(logs.map(log => log.adminId))] },
      })
        .select("adminId first_name last_name email -_id")
        .lean();
      const adminsById = new Map(admins.map(admin => [admin.adminId, admin]));

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ADMIN_ACTIVITY}-${adminMessagesEnum.ADMIN_ACTIVITY_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: adminMessagesEnum.ADMIN_ACTIVITY_FETCHED_SUCCESSFULLY,
        logs: logs.map(log => ({
          ...log,
          adminDetails: adminsById.get(log.adminId) ?? null,
        })),
        pagination,
      });
    } catch (error) {
      logger.error(
        `Get admin activity failed::${labelEnum.CURRENT_TIME_STAMP}-${adminLabelEnum.GET_ADMIN_ACTIVITY}`,
        error.message
      );
      next(error);
    }
  },
};
