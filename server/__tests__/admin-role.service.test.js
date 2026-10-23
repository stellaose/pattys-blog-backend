import AdminRoleService from "../service/admin/admin-role.service.js";
import { AdminRoles } from "../models/admin/admin-roles.model.js";
import { AdminResource } from "../models/admin/admin-resources.model.js";
import { AdminAuth } from "../models/admin/admin-auth.model.js";
import { adminMessagesEnum } from "../enums/index.js";

// ! mock the schemas the service reads, so no database is needed
jest.mock("../models/admin/admin-roles.model.js", () => ({
  AdminRoles: {
    find: jest.fn(),
    findOne: jest.fn(),
    exists: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock("../models/admin/admin-resources.model.js", () => ({
  AdminResource: { find: jest.fn() },
}));
jest.mock("../models/admin/admin-auth.model.js", () => ({
  AdminAuth: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../models/admin/admin-permissions.model.js", () => ({
  AdminRolePermission: { find: jest.fn(), updateMany: jest.fn() },
}));

// ? Mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// =  nanoid ships ESM only; role codes come out in a fixed order here
const mockCodes = [];
jest.mock("nanoid", () => ({
  nanoid: () => "abc123",
  customAlphabet: () => () => mockCodes.shift() ?? "ZZZZZ",
}));

// ~ fake Mongoose query: records the chain and resolves to the given rows
const makeQuery = rows => {
  const query = {
    sort: jest.fn(() => query),
    populate: jest.fn(() => query),
    select: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
  };
  return query;
};

const rejection = async promise => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCodes.length = 0;
});

// # name clashes, checked across live and deleted roles
describe("confirmThatRoleDoesNotExist", () => {
  test("passes when no role has the name", async () => {
    AdminRoles.findOne.mockResolvedValue(null);

    await expect(
      AdminRoleService.confirmThatRoleDoesNotExist("Editor", "label")
    ).resolves.toBeUndefined();
    expect(AdminRoles.findOne).toHaveBeenCalledWith({
      role: "editor",
      isDeleted: { $in: [true, false, null] },
    });
  });

  test("throws 409 when another role has the name", async () => {
    AdminRoles.findOne.mockResolvedValue({ roleId: "role-2" });

    const error = await rejection(
      AdminRoleService.confirmThatRoleDoesNotExist("Editor", "label")
    );

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe(adminMessagesEnum.ROLE_EXISTS);
  });

  // ? renaming a role to its own current name is not a clash
  test("ignores the role being renamed", async () => {
    AdminRoles.findOne.mockResolvedValue({ roleId: "role-1" });

    await expect(
      AdminRoleService.confirmThatRoleDoesNotExist("Editor", "label", "role-1")
    ).resolves.toBeUndefined();
  });
});

// # role codes
describe("generateUniqueAdminRoleCode", () => {
  // ? a code already in use is skipped and a new one drawn
  test("draws again until the code is unused", async () => {
    mockCodes.push("TAKEN", "FRESH");
    AdminRoles.exists.mockImplementation(async ({ code }) => code === "TAKEN");

    await expect(AdminRoleService.generateUniqueAdminRoleCode()).resolves.toBe(
      "FRESH"
    );
    expect(AdminRoles.exists).toHaveBeenCalledTimes(2);
  });

  test("gives up after 10 attempts instead of looping forever", async () => {
    AdminRoles.exists.mockResolvedValue(true);

    await expect(
      AdminRoleService.generateUniqueAdminRoleCode()
    ).rejects.toThrow("Could not generate a unique role code");
    expect(AdminRoles.exists).toHaveBeenCalledTimes(10);
  });
});

// # permission payloads
describe("validateRolePermissionsArray", () => {
  const permissions = [
    { resourceId: "resource-001", actions: ["read"] },
    { resourceId: "resource-002", actions: ["create"] },
  ];

  test("returns the resources when every one exists", async () => {
    const resources = [
      { resourceId: "resource-001", name: "blogs" },
      { resourceId: "resource-002", name: "reviews" },
    ];
    AdminResource.find.mockResolvedValue(resources);

    await expect(
      AdminRoleService.validateRolePermissionsArray(permissions, "label")
    ).resolves.toBe(resources);
  });

  test("throws 404 naming the resources that do not exist", async () => {
    AdminResource.find.mockResolvedValue([
      { resourceId: "resource-001", name: "blogs" },
    ]);

    const error = await rejection(
      AdminRoleService.validateRolePermissionsArray(permissions, "label")
    );

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe(
      adminMessagesEnum.RESOURCES_NOT_FOUND(["resource-002"])
    );
  });

  // ? a repeated resource is caught before any lookup
  test("throws 409 when a resource is listed twice", async () => {
    const error = await rejection(
      AdminRoleService.validateRolePermissionsArray(
        [...permissions, { resourceId: "resource-001", actions: ["delete"] }],
        "label"
      )
    );

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe(
      adminMessagesEnum.RESOURCE_REPEATED("resource-001")
    );
    expect(AdminResource.find).not.toHaveBeenCalled();
  });
});

// # the full permission grid for one role
describe("processRoleBasedPermissions", () => {
  test("lists every resource, with [] where the role has no actions", () => {
    const matrix = AdminRoleService.processRoleBasedPermissions(
      [{ resourceId: "resource-001", permissions: ["read", "update"] }],
      [
        { resourceId: "resource-001", name: "blogs" },
        { resourceId: "resource-002", name: "reviews" },
      ]
    );

    expect(matrix).toEqual([
      {
        resourceId: "resource-001",
        name: "blogs",
        permissions: ["read", "update"],
      },
      { resourceId: "resource-002", name: "reviews", permissions: [] },
    ]);
  });
});

// # list filters
describe("getAdminRolesAndPermissions", () => {
  // ? search is escaped, end dates are inclusive, and the page is clamped
  test("builds the filter and pages the result", async () => {
    const query = makeQuery([{ roleId: "role-1" }]);
    AdminRoles.find.mockReturnValue(query);
    AdminRoles.countDocuments.mockResolvedValue(41);

    const result = await AdminRoleService.getAdminRolesAndPermissions({
      search: "a.b",
      status: "active",
      startDate: "2026-10-01",
      endDate: "2026-10-23",
      page: "3",
      limit: "20",
    });

    const filter = AdminRoles.find.mock.calls[0][0];
    expect(filter.$or).toHaveLength(3);
    expect(filter.$or[0].name.source).toBe("a\\.b");
    expect(filter.status).toBe("active");
    expect(filter.createdAt).toEqual({
      $gte: new Date("2026-10-01T00:00:00.000Z"),
      $lt: new Date("2026-10-24T00:00:00.000Z"),
    });
    expect(query.skip).toHaveBeenCalledWith(40);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(AdminRoles.countDocuments).toHaveBeenCalledWith(filter);
    expect(result).toEqual({
      roles: [{ roleId: "role-1" }],
      total: 41,
      resultPerPage: 20,
      currentPage: 3,
    });
  });

  test("returns every match when paginate is false", async () => {
    const query = makeQuery([]);
    AdminRoles.find.mockReturnValue(query);
    AdminRoles.countDocuments.mockResolvedValue(5);

    const result = await AdminRoleService.getAdminRolesAndPermissions({
      paginate: false,
    });

    expect(AdminRoles.find).toHaveBeenCalledWith({});
    expect(query.skip).not.toHaveBeenCalled();
    expect(result.resultPerPage).toBe(5);
  });
});

// # admins holding a role
describe("getAdminsByRole", () => {
  // ! passwords and tokens must never be selected
  test("filters by role and never selects secrets", async () => {
    const query = makeQuery([]);
    AdminAuth.find.mockReturnValue(query);
    AdminAuth.countDocuments.mockResolvedValue(0);

    await AdminRoleService.getAdminsByRole({
      roleId: "role-1",
      status: "active",
    });

    expect(AdminAuth.find).toHaveBeenCalledWith({
      roleId: "role-1",
      status: "active",
    });
    const selected = query.select.mock.calls[0][0];
    expect(selected).not.toMatch(/password|Token/);
  });
});
