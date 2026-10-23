import { AdminActivityLog } from "../../models/admin/admin-activity-log.model.js";
import { operations } from "./admin-operations.lib.js";
import logger from "../../logger/logger.js";
import { createId } from "../../utils/helper.js";

// & saves one activity log; a failed write is logged but never thrown, so
// * tracking can never break the request that triggered it
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

// ? records what an admin did, e.g.
// - adminActivityTracking(adminId, 9, "success", descriptions.create_role(name, role))
export const adminActivityTracking = (
  adminId,
  op_code,
  activity_status,
  description
) => {
  if (!adminId) {
    return Promise.resolve();
  }

  const operation = operations[op_code];
  if (!operation) {
    logger.warn(`No activity operation found for code ${op_code}`);
    return Promise.resolve();
  }

  return monitor(
    {
      logId: createId("log", 24),
      adminId,
      operation,
      activity_status,
      description,
    },
    "adminActivityTracking",
    operation,
    adminId
  );
};
