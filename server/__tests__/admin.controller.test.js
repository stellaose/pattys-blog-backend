import { AdminController } from "../controller/admin/admin.controller.js";
import { AdminAuth } from "../models/admin/admin-auth.model.js";
import { AdminUserPermission } from "../models/admin/admin-user-permissions.model.js";
import { AdminActivityLog } from "../models/admin/admin-activity-log.model.js";
import { AdminAuthService } from "../service/admin/admin-auth.service.js";
import AdminRoleService from "../service/admin/admin-role.service.js";
import { adminMessagesEnum, messagesEnum } from "../enums/index.js";
import ErrorResponse from "../utils/ErrorHandler.js";

// ! mock admin and per-admin permission schemas
jest.mock("../models/admin/admin-auth.model.js", () => ({
  AdminAuth: { create: jest.fn() },
}));
jest.mock("../models/admin/admin-user-permissions.model.js", () => ({
  AdminUserPermission: { insertMany: jest.fn() },
}));

// # mock activity log model so tracking never touches the database
jest.mock("../models/admin/admin-activity-log.model.js", () => ({
  AdminActivityLog: { create: jest.fn().mockResolvedValue({}) },
}));

// > mock admin lookups
jest.mock("../service/admin/admin-auth.service.js", () => ({
  AdminAuthService: {
    getAdminByEmail: jest.fn(),
    getDeletedAdminByEmail: jest.fn(),
    getAdminByAdminId: jest.fn(),
    getAllAdmins: jest.fn(),
    countDocuments: jest.fn(),
    getAdminPermissions: jest.fn(),
    replaceAdminPermissions: jest.fn(),
    softDeleteAdminPermissions: jest.fn(),
  },
}));

// > mock role lookups
jest.mock("../service/admin/admin-role.service.js", () => ({
  __esModule: true,
  default: {
    getRoleByRoleId: jest.fn(),
    getRolePermissions: jest.fn(),
    validateRolePermissionsArray: jest.fn(),
  },
}));

// < mock transactions: a mockSession that records commit/abort
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
  inTransaction: jest.fn(() => false),
};
jest.mock("mongoose", () => ({
  __esModule: true,
  default: { startSession: jest.fn(async () => mockSession) },
}));

// ? Mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ' Mock bcrypt
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: jest.fn(async password => `hashed:${password}`) },
}));

// =  nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({
  nanoid: () => "abc123",
  customAlphabet: () => () => "ABCDE",
}));

const INVITER_ID = "admin-inviter";

const validBody = {
  first_name: "Grace",
  last_name: "Hopper",
  email: "Grace@Example.com",
  gender: "female",
  roleId: "role-1",
};

const makeRole = (overrides = {}) => ({
  roleId: "role-1",
  role: "editor",
  name: "Editor",
  status: "active",
  ...overrides,
});

// & AdminAuth.create resolves to [doc]; toObject() exposes the saved fields
const mockCreatedAdmin = () =>
  AdminAuth.create.mockImplementation(async ([doc]) => [
    { ...doc, toObject: () => ({ ...doc }) },
  ]);

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// ~ tracking is fire-and-forget, so let its admin lookup and write settle
const flushTracking = () => new Promise(resolve => setImmediate(resolve));

// # runs a controller handler and returns the response, next() and JSON body
const callHandler = async (handler, req) => {
  const res = makeRes();
  const next = jest.fn();
  await handler(
    { body: {}, params: {}, query: {}, adminId: INVITER_ID, ...req },
    res,
    next
  );
  await flushTracking();
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const call = req =>
  callHandler(AdminController.inviteAdmin, { body: validBody, ...req });

const expectError = (next, statusCode, message) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error.statusCode).toBe(statusCode);
  if (message !== undefined) expect(error.message).toBe(message);
};

beforeEach(() => {
  jest.clearAllMocks();
  AdminAuthService.getAdminByAdminId.mockResolvedValue({
    first_name: "Ada",
    last_name: "Obi",
  });
  AdminAuthService.getAdminByEmail.mockResolvedValue(null);
  AdminAuthService.getDeletedAdminByEmail.mockResolvedValue(null);
  AdminRoleService.getRoleByRoleId.mockResolvedValue(makeRole());
  AdminRoleService.getRolePermissions.mockResolvedValue([
    { resourceId: "resource-000", permissions: ["read"] },
    { resourceId: "resource-001", permissions: ["create", "read"] },
  ]);
});

// ` POST /admin/admins/invite
describe("AdminController.inviteAdmin", () => {
  test("creates a pending admin with the role's default permissions", async () => {
    mockCreatedAdmin();

    const { res, next, body } = await call();

    expect(next).not.toHaveBeenCalled();
    expect(AdminAuth.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          email: "grace@example.com",
          password: "hashed:abc123",
          role: "editor",
          roleId: "role-1",
          status: "pending",
          invitedBy: INVITER_ID,
        }),
      ],
      { session: mockSession }
    );
    expect(AdminUserPermission.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          resourceId: "resource-000",
          permissions: ["read"],
          roleId: "role-1",
          role_type: "editor",
        }),
        expect.objectContaining({
          resourceId: "resource-001",
          permissions: ["create", "read"],
        }),
      ],
      { session: mockSession }
    );
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(body.message).toBe(adminMessagesEnum.ADMIN_INVITED_SUCCESSFULLY);
    expect(body.admin).not.toHaveProperty("password");
  });

  test("returns the temporary password so the inviter can pass it on", async () => {
    mockCreatedAdmin();

    const { body } = await call();

    expect(body.temporaryPassword).toBe("abc123");
    expect(AdminAuth.create.mock.calls[0][0][0].password).toBe("hashed:abc123");
  });

  test("uses custom permissions instead of the role's defaults", async () => {
    mockCreatedAdmin();
    AdminRoleService.validateRolePermissionsArray.mockResolvedValue([
      { resourceId: "resource-002", name: "bloggers" },
    ]);

    const { next } = await call({
      body: {
        ...validBody,
        permissions: [{ resourceId: "resource-002", actions: ["delete"] }],
      },
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.getRolePermissions).not.toHaveBeenCalled();
    expect(AdminUserPermission.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          resourceId: "resource-002",
          permissions: ["delete"],
        }),
      ],
      { session: mockSession }
    );
  });

  test("tracks the invite against the inviting admin", async () => {
    mockCreatedAdmin();

    await call();

    expect(AdminActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: INVITER_ID,
        activity_type: "ADMINVADM",
        activity_status: "success",
        description: "Ada Obi invited administrator Grace Hopper",
      })
    );
  });

  test("rejects with 401 when no admin is logged in", async () => {
    const { next } = await call({ adminId: undefined });

    expectError(next, 401, messagesEnum.UNAUTHORIZED);
    expect(AdminAuth.create).not.toHaveBeenCalled();
  });

  test("rejects with 404 when the role does not exist", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(null);

    const { next } = await call();

    expectError(next, 404, adminMessagesEnum.ROLE_NOT_FOUND);
    expect(AdminAuth.create).not.toHaveBeenCalled();
  });

  test("rejects with 400 when the role is inactive", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(
      makeRole({ status: "inactive" })
    );

    const { next } = await call();

    expectError(next, 400, adminMessagesEnum.ROLE_INACTIVE);
  });

  test("rejects with 409 when the email belongs to an admin", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue({ adminId: "a-2" });

    const { next } = await call();

    expectError(next, 409, adminMessagesEnum.ADMIN_EMAIL_EXISTS);
    expect(AdminAuth.create).not.toHaveBeenCalled();
  });

  test("rejects with 409 when the email belongs to a deleted admin", async () => {
    AdminAuthService.getDeletedAdminByEmail.mockResolvedValue({
      adminId: "a-3",
    });

    const { next } = await call();

    expectError(next, 409, adminMessagesEnum.ADMIN_ALREADY_DELETED);
  });

  test("rejects with 404 for unknown resources and tracks the failure", async () => {
    AdminRoleService.validateRolePermissionsArray.mockRejectedValue(
      new ErrorResponse(
        adminMessagesEnum.RESOURCES_NOT_FOUND(["resource-999"]),
        404
      )
    );

    const { next } = await call({
      body: {
        ...validBody,
        permissions: [{ resourceId: "resource-999", actions: ["read"] }],
      },
    });

    expectError(
      next,
      404,
      adminMessagesEnum.RESOURCES_NOT_FOUND(["resource-999"])
    );
    expect(AdminAuth.create).not.toHaveBeenCalled();
    expect(AdminActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: INVITER_ID,
        activity_type: "ADMINVADM",
        activity_status: "failed",
        description: "Ada Obi failed to invite administrator Grace Hopper",
      })
    );
  });

  test("rolls back when saving the permissions fails", async () => {
    mockCreatedAdmin();
    AdminUserPermission.insertMany.mockRejectedValue(new Error("write failed"));
    mockSession.inTransaction.mockReturnValueOnce(true);

    const { next } = await call();

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.commitTransaction).not.toHaveBeenCalled();
  });
});

// & fake Mongoose admin document with stubbed save() and toObject()
const makeAdmin = (overrides = {}) => {
  const admin = {
    adminId: "admin-2",
    first_name: "Grace",
    last_name: "Hopper",
    email: "grace@example.com",
    password: "hashed:secret",
    passwordToken: 123456,
    role: "editor",
    roleId: "role-1",
    status: "active",
    is_completed_profile: false,
    ...overrides,
  };
  admin.save = jest.fn().mockResolvedValue(admin);
  admin.toObject = jest.fn(() => {
    // eslint-disable-next-line no-unused-vars
    const { save, toObject, ...fields } = admin;
    return { ...fields };
  });
  return admin;
};

// @ the logged-in admin plus whoever else a test needs, looked up by id
const mockAdmins = (...admins) => {
  const byId = Object.fromEntries(
    [
      makeAdmin({
        adminId: INVITER_ID,
        first_name: "Ada",
        last_name: "Obi",
        role: "admin",
      }),
      ...admins,
    ].map(admin => [admin.adminId, admin])
  );
  AdminAuthService.getAdminByAdminId.mockImplementation(
    async adminId => byId[adminId] ?? null
  );
  return byId;
};

const expectTracked = fields => {
  expect(AdminActivityLog.create).toHaveBeenCalledWith(
    expect.objectContaining(fields)
  );
};

// ~ fake Mongoose query: chainable like the real one and awaitable to the given rows
const makeQuery = rows => {
  const query = {
    find: jest.fn(() => query),
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    skip: jest.fn(() => query),
    getFilter: () => ({}),
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
};

// + PATCH /admin/admins/me/complete-profile
describe("AdminController.completeProfile", () => {
  const profile = {
    first_name: "Ada",
    last_name: "Obi",
    middle_name: "N",
    phone_number: "08012345678",
    gender: "female",
  };

  test("saves the profile, marks it complete and tracks it", async () => {
    const { [INVITER_ID]: me } = mockAdmins();
    AdminAuthService.getAdminPermissions.mockResolvedValue([]);

    const { res, next, body } = await callHandler(
      AdminController.completeProfile,
      { body: profile }
    );

    expect(next).not.toHaveBeenCalled();
    expect(me.phone_number).toBe("08012345678");
    expect(me.is_completed_profile).toBe(true);
    expect(me.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.admin).not.toHaveProperty("password");
    expectTracked({
      adminId: INVITER_ID,
      activity_type: "ADMCPPR",
      activity_status: "success",
    });
  });

  test("rejects with 400 when the profile is already complete", async () => {
    const { [INVITER_ID]: me } = mockAdmins();
    me.is_completed_profile = true;

    const { next } = await callHandler(AdminController.completeProfile, {
      body: profile,
    });

    expectError(next, 400, adminMessagesEnum.PROFILE_ALREADY_COMPLETED);
    expect(me.save).not.toHaveBeenCalled();
  });
});

// ' GET /admin/admins/me
describe("AdminController.getMyProfile", () => {
  test("returns the profile without secrets plus its permissions", async () => {
    mockAdmins();
    const permissions = [{ resourceId: "resource-000", permissions: ["read"] }];
    AdminAuthService.getAdminPermissions.mockResolvedValue(permissions);

    const { body } = await callHandler(AdminController.getMyProfile, {});

    expect(body.admin.adminId).toBe(INVITER_ID);
    expect(body.admin).not.toHaveProperty("password");
    expect(body.admin).not.toHaveProperty("passwordToken");
    expect(body.admin.permissions).toBe(permissions);
  });

  test("lists no permissions for a super admin, who has them all", async () => {
    const { [INVITER_ID]: me } = mockAdmins();
    me.role = "super_admin";

    const { body } = await callHandler(AdminController.getMyProfile, {});

    expect(body.admin.permissions).toEqual([]);
    expect(AdminAuthService.getAdminPermissions).not.toHaveBeenCalled();
  });
});

// - GET /admin/admins and /admin/admins/:adminId
describe("AdminController.getAllAdmins / getOneAdmin", () => {
  test("pages admins newest first and filters by status", async () => {
    const query = makeQuery([makeAdmin()]);
    AdminAuthService.getAllAdmins.mockReturnValue(query);
    AdminAuthService.countDocuments.mockResolvedValue(1);

    const { body } = await callHandler(AdminController.getAllAdmins, {
      query: { status: "pending" },
    });

    expect(query.find).toHaveBeenCalledWith({ status: "pending" });
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(body.admins).toHaveLength(1);
    expect(body.pagination).toEqual(
      expect.objectContaining({ totalAdmins: 1, currentPage: 1 })
    );
  });

  test("rejects with 404 for an unknown admin", async () => {
    mockAdmins();

    const { next } = await callHandler(AdminController.getOneAdmin, {
      params: { adminId: "missing" },
    });

    expectError(next, 404, adminMessagesEnum.ADMIN_NOT_FOUND);
  });
});

// ; PATCH /admin/admins/:adminId
describe("AdminController.editAdmin", () => {
  test("updates details without touching permissions and tracks it", async () => {
    const { "admin-2": grace } = mockAdmins(makeAdmin());
    AdminAuthService.getAdminPermissions.mockResolvedValue([]);

    const { next } = await callHandler(AdminController.editAdmin, {
      params: { adminId: "admin-2" },
      body: { phone_number: "08099999999" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(grace.phone_number).toBe("08099999999");
    expect(grace.save).toHaveBeenCalledWith({ session: mockSession });
    expect(AdminAuthService.replaceAdminPermissions).not.toHaveBeenCalled();
    expectTracked({
      adminId: INVITER_ID,
      activity_type: "EDTADMPM",
      activity_status: "success",
      description: "Ada Obi updated administrator Grace Hopper",
    });
  });

  test("switches role and copies the new role's default permissions", async () => {
    const { "admin-2": grace } = mockAdmins(makeAdmin());
    AdminRoleService.getRoleByRoleId.mockResolvedValue(
      makeRole({ roleId: "role-2", role: "moderator" })
    );
    AdminRoleService.getRolePermissions.mockResolvedValue([
      { resourceId: "resource-001", permissions: ["update"] },
    ]);

    await callHandler(AdminController.editAdmin, {
      params: { adminId: "admin-2" },
      body: { roleId: "role-2" },
    });

    expect(grace.role).toBe("moderator");
    expect(AdminAuthService.replaceAdminPermissions).toHaveBeenCalledWith(
      grace,
      { roleId: "role-2", role: "moderator" },
      [{ resourceId: "resource-001", actions: ["update"] }],
      expect.any(Function),
      mockSession
    );
    expect(mockSession.commitTransaction).toHaveBeenCalled();
  });

  test("rejects with 403 when a non super admin assigns super admin", async () => {
    const { "admin-2": grace } = mockAdmins(makeAdmin());
    AdminRoleService.getRoleByRoleId.mockResolvedValue(
      makeRole({ roleId: "role-super", role: "super_admin" })
    );

    const { next } = await callHandler(AdminController.editAdmin, {
      params: { adminId: "admin-2" },
      body: { roleId: "role-super" },
    });

    expectError(next, 403, adminMessagesEnum.SUPER_ADMIN_ROLE_NOT_ALLOWED);
    expect(grace.save).not.toHaveBeenCalled();
    expectTracked({ activity_type: "EDTADMPM", activity_status: "failed" });
  });

  test("rejects with 409 when the new email is taken", async () => {
    mockAdmins(makeAdmin());
    AdminAuthService.getAdminByEmail.mockResolvedValue({ adminId: "admin-3" });

    const { next } = await callHandler(AdminController.editAdmin, {
      params: { adminId: "admin-2" },
      body: { email: "taken@example.com" },
    });

    expectError(next, 409, adminMessagesEnum.ADMIN_EMAIL_EXISTS);
  });
});

// * PATCH /admin/admins/:adminId/status
describe("AdminController.updateAdminStatus", () => {
  test("suspends an admin and tracks the status change", async () => {
    const { "admin-2": grace } = mockAdmins(makeAdmin());

    const { next } = await callHandler(AdminController.updateAdminStatus, {
      params: { adminId: "admin-2" },
      body: { status: "suspended" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(grace.status).toBe("suspended");
    expect(grace.save).toHaveBeenCalled();
    expectTracked({
      activity_type: "UPTADMSTAS",
      activity_status: "success",
      description: "Ada Obi updated admin Grace Hopper's status to suspended",
    });
  });

  test("rejects with 400 when admins change their own status", async () => {
    mockAdmins();

    const { next } = await callHandler(AdminController.updateAdminStatus, {
      params: { adminId: INVITER_ID },
      body: { status: "inactive" },
    });

    expectError(next, 400, adminMessagesEnum.CANNOT_UPDATE_OWN_STATUS);
  });

  test("rejects with 400 when the status is unchanged", async () => {
    mockAdmins(makeAdmin());

    const { next } = await callHandler(AdminController.updateAdminStatus, {
      params: { adminId: "admin-2" },
      body: { status: "active" },
    });

    expectError(next, 400, adminMessagesEnum.ADMIN_STATUS_UNCHANGED("active"));
  });
});

// ` DELETE /admin/admins/:adminId
describe("AdminController.deleteAdmin", () => {
  test("soft deletes the admin and their permissions, keeping the logs", async () => {
    const { "admin-2": grace } = mockAdmins(makeAdmin());

    const { res, next } = await callHandler(AdminController.deleteAdmin, {
      params: { adminId: "admin-2" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(grace.isDeleted).toBe(true);
    expect(grace.save).toHaveBeenCalledWith({ session: mockSession });
    expect(AdminAuthService.softDeleteAdminPermissions).toHaveBeenCalledWith(
      "admin-2",
      mockSession
    );
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expectTracked({
      adminId: INVITER_ID,
      activity_type: "ADMDELADM",
      activity_status: "success",
    });
  });

  test("rejects with 400 when admins delete themselves", async () => {
    mockAdmins();

    const { next } = await callHandler(AdminController.deleteAdmin, {
      params: { adminId: INVITER_ID },
    });

    expectError(next, 400, adminMessagesEnum.CANNOT_DELETE_SELF);
  });
});
