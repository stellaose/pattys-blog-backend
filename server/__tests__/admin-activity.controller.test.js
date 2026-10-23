import { AdminActivityController } from "../controller/admin/admin-activity.controller.js";
import { UserActivityLog } from "../models/user/user-activity-log.model.js";
import { AdminActivityLog } from "../models/admin/admin-activity-log.model.js";
import { AdminAuth } from "../models/admin/admin-auth.model.js";
import { AuthService } from "../service/user/auth.service.js";
import { adminMessagesEnum } from "../enums/index.js";

// ! chainable query: every step returns the chain, lean() resolves to the rows
const query = rows => {
  const chain = {
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    select: jest.fn(() => chain),
    lean: jest.fn(async () => rows),
  };
  return chain;
};

jest.mock("../models/user/user-activity-log.model.js", () => ({
  UserActivityLog: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../models/admin/admin-activity-log.model.js", () => ({
  AdminActivityLog: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../models/admin/admin-auth.model.js", () => ({
  AdminAuth: { find: jest.fn() },
}));
jest.mock("../service/user/auth.service.js", () => ({
  AuthService: { getAuthorDetailsByUserIds: jest.fn() },
}));
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const callHandler = async (handler, query = {}) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ query }, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const userLog = {
  userId: "user-1",
  logId: "log-1",
  activity_type: "USRLGN",
  description: "Ada logged in",
  activity_status: "success",
};

beforeEach(() => jest.clearAllMocks());

describe("AdminActivityController.getUserActivity", () => {
  it("returns the newest page of user logs with each user's name", async () => {
    const chain = query([userLog]);
    UserActivityLog.find.mockReturnValue(chain);
    UserActivityLog.countDocuments.mockResolvedValue(23);
    AuthService.getAuthorDetailsByUserIds.mockResolvedValue(
      new Map([["user-1", { userId: "user-1", first_name: "Ada" }]])
    );

    const { res, body } = await callHandler(
      AdminActivityController.getUserActivity,
      { page: "2", limit: "10" }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(
      adminMessagesEnum.USER_ACTIVITY_FETCHED_SUCCESSFULLY
    );
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(body.logs).toEqual([
      { ...userLog, userDetails: { userId: "user-1", first_name: "Ada" } },
    ]);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it("filters by status", async () => {
    UserActivityLog.find.mockReturnValue(query([]));
    UserActivityLog.countDocuments.mockResolvedValue(0);
    AuthService.getAuthorDetailsByUserIds.mockResolvedValue(new Map());

    const { body } = await callHandler(
      AdminActivityController.getUserActivity,
      { status: "failed" }
    );

    expect(UserActivityLog.find).toHaveBeenCalledWith({
      activity_status: "failed",
    });
    expect(UserActivityLog.countDocuments).toHaveBeenCalledWith({
      activity_status: "failed",
    });
    expect(body.pagination.totalPages).toBe(1);
  });

  it("passes database errors to next()", async () => {
    UserActivityLog.find.mockImplementation(() => {
      throw new Error("db down");
    });
    UserActivityLog.countDocuments.mockResolvedValue(0);

    const { next, res } = await callHandler(
      AdminActivityController.getUserActivity
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("AdminActivityController.getAdminActivity", () => {
  it("returns admin logs with each admin's name and email", async () => {
    AdminActivityLog.find.mockReturnValue(
      query([
        {
          adminId: "admin-1",
          logId: "log-9",
          description: "Patty invited Sam",
          activity_status: "success",
        },
        {
          adminId: "gone",
          logId: "log-8",
          description: "Old admin action",
          activity_status: "failed",
        },
      ])
    );
    AdminActivityLog.countDocuments.mockResolvedValue(2);
    AdminAuth.find.mockReturnValue(
      query([
        {
          adminId: "admin-1",
          first_name: "Patty",
          last_name: "Ose",
          email: "patty@example.com",
        },
      ])
    );

    const { body } = await callHandler(
      AdminActivityController.getAdminActivity
    );

    expect(body.message).toBe(
      adminMessagesEnum.ADMIN_ACTIVITY_FETCHED_SUCCESSFULLY
    );
    expect(AdminAuth.find).toHaveBeenCalledWith({
      adminId: { $in: ["admin-1", "gone"] },
    });
    expect(body.logs[0].adminDetails.email).toBe("patty@example.com");
    expect(body.logs[1].adminDetails).toBeNull();
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });
});
