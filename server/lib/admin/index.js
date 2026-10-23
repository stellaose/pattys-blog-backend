import { AdminActivityLog } from "../../models/admin/admin-activity-log.model.js";
import { AdminAuthService } from "../../service/admin/admin-auth.service.js";
import { adminOperations } from "./admin-operations.lib.js";
import logger from "../../logger/logger.js";
import { createId, getFullName } from "../../utils/helper.js";

export { adminDescriptions } from "./admin-description.lib.js";

// & saves one activity log; a failed write is logged but never thrown
const monitor = async (log, type) => {
  try {
    await AdminActivityLog.create(log);
    return logger.info(`${type}: activity for ${log.activity_type} tracked`);
  } catch (error) {
    logger.error(error.message);
    return logger.info(
      `${type}: activity for ${log.activity_type} not tracked`
    );
  }
};

// ~ looks the admin up by id for their name; falls back to the id if they can't be found
const resolveAdminName = async adminId => {
  try {
    const admin = await AdminAuthService.getAdminByAdminId(adminId);
    return admin ? getFullName(admin) : adminId;
  } catch (error) {
    logger.error(error.message);
    return adminId;
  }
};

// ? records what an admin did
export const adminActivityTracking = async (
  adminId,
  op_code,
  activity_status,
  describe,
  adminName
) => {
  if (!adminId) {
    return;
  }

  const activity_type = adminOperations[op_code];
  if (!activity_type) {
    logger.warn(`No activity operation found for code ${op_code}`);
    return;
  }

  // > a ready-made string needs no name, so skip the lookup
  const name =
    typeof describe === "function"
      ? (adminName ?? (await resolveAdminName(adminId)))
      : undefined;

  return monitor(
    {
      logId: createId("log", 24),
      adminId,
      activity_type,
      activity_status,
      description: typeof describe === "function" ? describe(name) : describe,
    },
    "adminActivityTracking"
  );
};
