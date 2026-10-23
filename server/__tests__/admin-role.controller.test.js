import { AdminRoleController } from "../controller/admin/admin-role.controller.js";
import { AdminRoles } from "../models/admin/admin-roles.model.js";
import { AdminActivityLog } from "../models/admin/admin-activity-log.model.js";
import AdminRoleService from "../service/admin/admin-role.service.js";
import { AdminAuthService } from "../service/admin/admin-auth.service.js";
import { adminLabelEnum, adminMessagesEnum } from "../enums/index.js";
import ErrorResponse from "../utils/ErrorHandler.js";

// ! mock role schema
jest.mock("../models/admin/admin-roles.model.js", () => ({
  AdminRoles: { create: jest.fn() },
}));

// > mock role service; toRoleType stays real so names map like production
jest.mock("../service/admin/admin-role.service.js", () => ({
  __esModule: true,
  toRoleType: name => name.trim().toLowerCase().replace(/\s+/g, "_"),
  default: {
    getAdminRolesAndPermissions: jest.fn(),
    getRoleByRoleId: jest.fn(),
    getRoleWithPermissions: jest.fn(),
    confirmThatRoleDoesNotExist: jest.fn(),
    generateUniqueAdminRoleCode: jest.fn(),
    getAdminResources: jest.fn(),
    processRoleBasedPermissions: jest.fn(),
    validateRolePermissionsArray: jest.fn(),
    updateAdminRoleStatus: jest.fn(),
    deleteAdminRole: jest.fn(),
    countAdminsWithRole: jest.fn(),
    getAdminsByRole: jest.fn(),
    renameRolePermissions: jest.fn(),
    upsertRolePermissions: jest.fn(),
  },
}));

// # mock activity log model so tracking never touches the database
jest.mock("../models/admin/admin-activity-log.model.js", () => ({
  AdminActivityLog: { create: jest.fn().mockResolvedValue({}) },
}));

// < mock admin lookup used to put a name on each activity log
jest.mock("../service/admin/admin-auth.service.js", () => ({
  AdminAuthService: { getAdminByAdminId: jest.fn() },
}));

// ? Mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// =  nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({
  nanoid: () => "abc123",
  customAlphabet: () => () => "ABCDE",
}));

const ADMIN_ID = "admin-1";

// & fake Mongoose role document with stubbed save() and softDelete()
const makeRole = (overrides = {}) => ({
  roleId: "role-1",
  role: "editor",
  name: "Editor",
  code: "QWERT",
  status: "active",
  save: jest.fn().mockResolvedValue(undefined),
  softDelete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// ~ tracking is fire-and-forget, so let its admin lookup and write settle
const flushTracking = () => new Promise(resolve => setImmediate(resolve));

// # runs a controller handler and returns the response, next() and JSON body
const call = async (handler, req) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ body: {}, params: {}, adminId: ADMIN_ID, ...req }, res, next);
  await flushTracking();
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

// $ asserts the handler passed one error with this status (and message) to next()
const expectError = (next, statusCode, message) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error.statusCode).toBe(statusCode);
  if (message !== undefined) expect(error.message).toBe(message);
};

// @ asserts exactly one activity log was written with these fields
const expectTracked = fields => {
  expect(AdminActivityLog.create).toHaveBeenCalledTimes(1);
  expect(AdminActivityLog.create).toHaveBeenCalledWith(
    expect.objectContaining({ adminId: ADMIN_ID, ...fields })
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  AdminAuthService.getAdminByAdminId.mockResolvedValue({
    first_name: "Ada",
    last_name: "Obi",
  });
  // $ the service's checks pass and its writes succeed unless a test says otherwise
  AdminRoleService.confirmThatRoleDoesNotExist.mockResolvedValue(undefined);
  AdminRoleService.generateUniqueAdminRoleCode.mockResolvedValue("ABCDE");
  AdminRoleService.getAdminResources.mockResolvedValue([]);
  AdminRoleService.processRoleBasedPermissions.mockReturnValue([]);
  AdminRoleService.updateAdminRoleStatus.mockImplementation(
    async (role, status) => Object.assign(role, { status })
  );
  AdminRoleService.deleteAdminRole.mockResolvedValue(undefined);
});

// ! the 409 the service throws when a role name is taken
const roleExists = () => new ErrorResponse(adminMessagesEnum.ROLE_EXISTS, 409);

// + GET /admin/role
describe("AdminRoleController.getAllRoles", () => {
  // ? passes the list filters straight to the service and pages the result
  test("returns a page of roles with their permissions, without tracking", async () => {
    AdminRoleService.getAdminRolesAndPermissions.mockResolvedValue({
      roles: [makeRole()],
      total: 21,
      resultPerPage: 20,
      currentPage: 1,
    });

    const query = {
      search: "edit",
      status: "active",
      startDate: "2026-10-01",
      endDate: "2026-10-23",
    };
    const { res, next, body } = await call(AdminRoleController.getAllRoles, {
      query,
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.getAdminRolesAndPermissions).toHaveBeenCalledWith(
      expect.objectContaining(query)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(adminMessagesEnum.ROLES_FETCHED_SUCCESSFULLY);
    expect(body.roles).toHaveLength(1);
    expect(body.pagination).toEqual({
      count: 1,
      totalRoles: 21,
      resultPerPage: 20,
      totalPages: 2,
      currentPage: 1,
    });
    expect(AdminActivityLog.create).not.toHaveBeenCalled();
  });
});

// - GET /admin/role/:roleId
describe("AdminRoleController.getOneRole", () => {
  test("returns the role with its permissions", async () => {
    const role = { ...makeRole(), permissions: [] };
    AdminRoleService.getRoleWithPermissions.mockResolvedValue(role);

    const { res, next, body } = await call(AdminRoleController.getOneRole, {
      params: { roleId: "role-1" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.getRoleWithPermissions).toHaveBeenCalledWith(
      "role-1"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.role).toBe(role);
  });

  // ? every resource is listed so the admin screen can show the whole grid
  test("adds a permission matrix covering every resource", async () => {
    const rows = [{ resourceId: "resource-001", permissions: ["read"] }];
    const resources = [
      { resourceId: "resource-001", name: "blogs" },
      { resourceId: "resource-002", name: "reviews" },
    ];
    const matrix = [{ resourceId: "resource-001", permissions: ["read"] }];
    AdminRoleService.getRoleWithPermissions.mockResolvedValue({
      ...makeRole(),
      permissions: rows,
    });
    AdminRoleService.getAdminResources.mockResolvedValue(resources);
    AdminRoleService.processRoleBasedPermissions.mockReturnValue(matrix);

    const { body } = await call(AdminRoleController.getOneRole, {
      params: { roleId: "role-1" },
    });

    expect(AdminRoleService.processRoleBasedPermissions).toHaveBeenCalledWith(
      rows,
      resources
    );
    expect(body.permissionMatrix).toBe(matrix);
  });

  test("rejects with 404 when the role does not exist", async () => {
    AdminRoleService.getRoleWithPermissions.mockResolvedValue(null);

    const { next } = await call(AdminRoleController.getOneRole, {
      params: { roleId: "missing" },
    });

    expectError(next, 404, adminMessagesEnum.ROLE_NOT_FOUND);
  });
});

// ` POST /admin/role
describe("AdminRoleController.createRole", () => {
  test("creates an active role from the name and tracks it", async () => {
    AdminRoles.create.mockImplementation(async doc => doc);

    const { res, next, body } = await call(AdminRoleController.createRole, {
      body: { name: "Content Manager" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.confirmThatRoleDoesNotExist).toHaveBeenCalledWith(
      "Content Manager",
      adminLabelEnum.CREATE_ROLE
    );
    expect(AdminRoles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "content_manager",
        name: "Content Manager",
        code: "ABCDE",
        status: "active",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(body.message).toBe(adminMessagesEnum.ROLE_CREATED_SUCCESSFULLY);
    expectTracked({
      activity_type: "ADMCRTARLE",
      activity_status: "success",
      description: "Ada Obi created role Content Manager",
    });
  });

  test("rejects with 409 when the name is taken and tracks the failure", async () => {
    AdminRoleService.confirmThatRoleDoesNotExist.mockRejectedValue(
      roleExists()
    );

    const { next } = await call(AdminRoleController.createRole, {
      body: { name: "Editor" },
    });

    expectError(next, 409, adminMessagesEnum.ROLE_EXISTS);
    expect(AdminRoles.create).not.toHaveBeenCalled();
    expectTracked({
      activity_type: "ADMCRTARLE",
      activity_status: "failed",
      description: "Ada Obi failed to create role Editor",
    });
  });
});

// ; PATCH /admin/role/:roleId
describe("AdminRoleController.editRole", () => {
  test("renames the role and its permission rows", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);

    const { res, next } = await call(AdminRoleController.editRole, {
      params: { roleId: "role-1" },
      body: { name: "Senior Editor" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(role.name).toBe("Senior Editor");
    expect(role.role).toBe("senior_editor");
    expect(role.save).toHaveBeenCalled();
    expect(AdminRoleService.renameRolePermissions).toHaveBeenCalledWith(
      "role-1",
      "senior_editor"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expectTracked({ activity_type: "ADMEDTRLE", activity_status: "success" });
  });

  // ? passing its own id means keeping the current name is not a clash
  test("checks the new name against every role except itself", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(makeRole());

    await call(AdminRoleController.editRole, {
      params: { roleId: "role-1" },
      body: { name: "editor" },
    });

    expect(AdminRoleService.confirmThatRoleDoesNotExist).toHaveBeenCalledWith(
      "editor",
      adminLabelEnum.EDIT_ROLE,
      "role-1"
    );
  });

  test("rejects with 409 when another role has the name", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);
    AdminRoleService.confirmThatRoleDoesNotExist.mockRejectedValue(
      roleExists()
    );

    const { next } = await call(AdminRoleController.editRole, {
      params: { roleId: "role-1" },
      body: { name: "Admin" },
    });

    expectError(next, 409, adminMessagesEnum.ROLE_EXISTS);
    expect(role.save).not.toHaveBeenCalled();
  });

  test("rejects with 404 when the role does not exist", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(null);

    const { next } = await call(AdminRoleController.editRole, {
      params: { roleId: "missing" },
      body: { name: "Editor" },
    });

    expectError(next, 404, adminMessagesEnum.ROLE_NOT_FOUND);
    expectTracked({ activity_type: "ADMEDTRLE", activity_status: "failed" });
  });
});

// ' PATCH /admin/role/:roleId/status
describe("AdminRoleController.updateRoleStatus", () => {
  test("deactivates an active role and tracks it as a deactivation", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);

    const { next } = await call(AdminRoleController.updateRoleStatus, {
      params: { roleId: "role-1" },
      body: { status: "inactive" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.updateAdminRoleStatus).toHaveBeenCalledWith(
      role,
      "inactive"
    );
    expect(role.status).toBe("inactive");
    expectTracked({
      activity_type: "ADMDCTRLE",
      activity_status: "success",
      description: "Ada Obi deactivated role Editor",
    });
  });

  test("activates an inactive role and tracks it as an activation", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(
      makeRole({ status: "inactive" })
    );

    await call(AdminRoleController.updateRoleStatus, {
      params: { roleId: "role-1" },
      body: { status: "active" },
    });

    expectTracked({ activity_type: "ADMACTRLE", activity_status: "success" });
  });

  test("rejects with 400 when the role already has that status", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);

    const { next } = await call(AdminRoleController.updateRoleStatus, {
      params: { roleId: "role-1" },
      body: { status: "active" },
    });

    expectError(next, 400, adminMessagesEnum.ROLE_STATUS_UNCHANGED("active"));
    expect(AdminRoleService.updateAdminRoleStatus).not.toHaveBeenCalled();
    expectTracked({ activity_type: "ADMACTRLE", activity_status: "failed" });
  });
});

// * DELETE /admin/role/:roleId
describe("AdminRoleController.deleteRole", () => {
  test("soft deletes the role and its permissions when no admin uses it", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);
    AdminRoleService.countAdminsWithRole.mockResolvedValue(0);

    const { res, next } = await call(AdminRoleController.deleteRole, {
      params: { roleId: "role-1" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.deleteAdminRole).toHaveBeenCalledWith(role);
    expect(res.status).toHaveBeenCalledWith(200);
    expectTracked({ activity_type: "ADMDELRLE", activity_status: "success" });
  });

  test("rejects with 409 while admins still have the role", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);
    AdminRoleService.countAdminsWithRole.mockResolvedValue(2);

    const { next } = await call(AdminRoleController.deleteRole, {
      params: { roleId: "role-1" },
    });

    expectError(next, 409, adminMessagesEnum.ROLE_IN_USE);
    expect(AdminRoleService.deleteAdminRole).not.toHaveBeenCalled();
    expectTracked({ activity_type: "ADMDELRLE", activity_status: "failed" });
  });
});

// & POST /admin/role/:roleId/permissions
describe("AdminRoleController.setRolePermissions", () => {
  const permissions = [
    { resourceId: "resource-000", actions: ["read"] },
    { resourceId: "resource-001", actions: ["create", "update"] },
  ];

  test("upserts each resource's actions and returns the role with permissions", async () => {
    const role = makeRole();
    AdminRoleService.getRoleByRoleId.mockResolvedValue(role);
    AdminRoleService.validateRolePermissionsArray.mockResolvedValue([
      { resourceId: "resource-000", name: "blogs" },
      { resourceId: "resource-001", name: "reviews" },
    ]);
    const withPermissions = { ...role, permissions: [] };
    AdminRoleService.getRoleWithPermissions.mockResolvedValue(withPermissions);

    const { res, next, body } = await call(
      AdminRoleController.setRolePermissions,
      { params: { roleId: "role-1" }, body: { permissions } }
    );

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.upsertRolePermissions).toHaveBeenCalledWith(
      role,
      permissions,
      expect.any(Function)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.role).toBe(withPermissions);
    expectTracked({
      activity_type: "ADMSTRLPM",
      activity_status: "success",
      description:
        "Ada Obi updated permissions for role Editor on blogs, reviews",
    });
  });

  test("rejects with 404 naming the resources that do not exist", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(makeRole());
    AdminRoleService.validateRolePermissionsArray.mockRejectedValue(
      new ErrorResponse(
        adminMessagesEnum.RESOURCES_NOT_FOUND(["resource-001"]),
        404
      )
    );

    const { next } = await call(AdminRoleController.setRolePermissions, {
      params: { roleId: "role-1" },
      body: { permissions },
    });

    expectError(
      next,
      404,
      adminMessagesEnum.RESOURCES_NOT_FOUND(["resource-001"])
    );
    expect(AdminRoleService.upsertRolePermissions).not.toHaveBeenCalled();
    expectTracked({ activity_type: "ADMSTRLPM", activity_status: "failed" });
  });
});

// % GET /admin/role/:roleId/admins
describe("AdminRoleController.getAdminsByRole", () => {
  // ? filters go to the service; the response names the role and pages the admins
  test("returns a page of the role's admins", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(makeRole());
    AdminRoleService.getAdminsByRole.mockResolvedValue({
      admins: [{ adminId: "admin-2" }],
      total: 1,
      resultPerPage: 20,
      currentPage: 1,
    });

    const { res, next, body } = await call(
      AdminRoleController.getAdminsByRole,
      {
        params: { roleId: "role-1" },
        query: { search: "ada", status: "active" },
      }
    );

    expect(next).not.toHaveBeenCalled();
    expect(AdminRoleService.getAdminsByRole).toHaveBeenCalledWith(
      expect.objectContaining({
        roleId: "role-1",
        search: "ada",
        status: "active",
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.role).toEqual({
      roleId: "role-1",
      name: "Editor",
      role: "editor",
    });
    expect(body.admins).toHaveLength(1);
    expect(body.pagination).toEqual(
      expect.objectContaining({ totalAdmins: 1, totalPages: 1 })
    );
  });

  test("rejects with 404 when the role does not exist", async () => {
    AdminRoleService.getRoleByRoleId.mockResolvedValue(null);

    const { next } = await call(AdminRoleController.getAdminsByRole, {
      params: { roleId: "missing" },
      query: {},
    });

    expectError(next, 404, adminMessagesEnum.ROLE_NOT_FOUND);
    expect(AdminRoleService.getAdminsByRole).not.toHaveBeenCalled();
  });
});
