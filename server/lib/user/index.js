import { UserActivityLog } from "../../models/user/user-activity-log.model.js";
import { AuthService } from "../../service/user/auth.service.js";
import { userOperations } from "./user-operations.lib.js";
import logger from "../../logger/logger.js";
import { createId, getFullName } from "../../utils/helper.js";

export { userDescriptions } from "./user-description.lib.js";

// & saves one activity log; a failed write is logged but never thrown

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

// ~ looks the user up by id for their name; falls back to the id if they can't be found
const resolveUserName = async userId => {
  try {
    const user = await AuthService.getUserByUserId(userId);
    return user ? getFullName(user) : userId;
  } catch (error) {
    logger.error(error.message);
    return userId;
  }
};

// ? records what a user did
export const userActivityTracking = async (
  userId,
  op_code,
  activity_status,
  describe,
  userName
) => {
  if (!userId) {
    return;
  }

  const activity_type = userOperations[op_code];
  if (!activity_type) {
    logger.warn(`No activity operation found for code ${op_code}`);
    return;
  }

  // > a ready-made string needs no name, so skip the lookup
  const name =
    typeof describe === "function"
      ? (userName ?? (await resolveUserName(userId)))
      : undefined;

  return monitor(
    {
      logId: createId("log", 24),
      userId,
      activity_type,
      activity_status,
      description: typeof describe === "function" ? describe(name) : describe,
    },
    "userActivityTracking"
  );
};
