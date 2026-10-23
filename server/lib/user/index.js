import { UserActivityLog } from "../../models/user/user-activity-log.model.js";
import { operations } from "./user-operations.lib.js";
import logger from "../../logger/logger.js";
import { createId } from "../../utils/helper.js";

// & saves one activity log; a failed write is logged but never thrown, so
// * tracking can never break the request that triggered it
const monitor = async (log, type) => {
  try {
    await UserActivityLog.create(log);
    return logger.info(`${type}: activity for ${log.activity_type} tracked`);
  } catch (error) {
    logger.error(error.message);
    return logger.info(
      `${type}: activity for ${log.activity_type} not tracked`
    );
  }
};

// ? records what a user did, e.g.
// - userActivityTracking(userId, 12, "success", descriptions.create_blog(name, blogId), blogId)
export const userActivityTracking = (
  userId,
  op_code,
  activity_status,
  description,
  resourceId
) => {
  if (!userId) {
    return Promise.resolve();
  }

  const activity_type = operations[op_code];
  if (!activity_type) {
    logger.warn(`No activity operation found for code ${op_code}`);
    return Promise.resolve();
  }

  return monitor(
    {
      logId: createId("log", 24),
      userId,
      resourceId,
      activity_type,
      activity_status,
      description,
    },
    "userActivityTracking"
  );
};
