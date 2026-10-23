import { AdminRoles } from "../../models/admin/admin-roles.model.js";
import { AdminRolePermission } from "../../models/admin/admin-permissions.model.js";
import { AdminResource } from "../../models/admin/admin-resources.model.js";
import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import logger from "../../logger/logger.js";
import { createRoleCode } from "../../utils/helper.js";
import { adminMessagesEnum, labelEnum, statusEnum } from "../../enums/index.js";

// ; "Content Manager" -> "content_manager", matching the seeded roles' `role` field
export const toRoleType = name =>
  name.trim().toLowerCase().replace(/\s+/g, "_");

// ! search text is user input, so escape it before it becomes a regex
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchFilter = (search, fields) => {
  if (!search) return {};
  const pattern = new RegExp(escapeRegex(search.trim()), "i");
  return { $or: fields.map(field => ({ [field]: pattern })) };
};

// ~ whole days in UTC: startDate from 00:00, endDate up to the end of that day
const createdAtFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
  if (endDate) {
    const dayAfter = new Date(`${endDate}T00:00:00.000Z`);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    createdAt.$lt = dayAfter;
  }
  return { createdAt };
};

const listFilter = ({ search, status, startDate, endDate }, searchFields) => ({
  ...searchFilter(search, searchFields),
  ...(status && { status }),
  ...createdAtFilter(startDate, endDate),
});

const pageOf = (page, limit) => {
  const perPage = Math.min(Number(limit) || 20, 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  return { perPage, currentPage, skip: (currentPage - 1) * perPage };
};

const withResourceNames = {
  path: "permissions",
  populate: { path: "resource", select: "resourceId name -_id" },
};

const AdminRoleService = {
  // + every live role, for dropdowns: no paging or permissions
  getAdminRoles: async () => {
    return await AdminRoles.find().sort({ name: 1 });
  },

  // + roles with their permissions, filtered by name/code search, status and
  // creation date; `paginate: false` returns every match
  getAdminRolesAndPermissions: async ({
    search,
    status,
    startDate,
    endDate,
    page,
    limit,
    paginate = true,
  }) => {
    const filter = listFilter({ search, status, startDate, endDate }, [
      "name",
      "role",
      "code",
    ]);
    const { perPage, currentPage, skip } = pageOf(page, limit);

    let query = AdminRoles.find(filter)
      .sort({ name: 1 })
      .populate(withResourceNames);
    if (paginate) {
      query = query.skip(skip).limit(perPage);
    }

    const [roles, total] = await Promise.all([
      query,
      AdminRoles.countDocuments(filter),
    ]);

    return {
      roles,
      total,
      resultPerPage: paginate ? perPage : total,
      currentPage: paginate ? currentPage : 1,
    };
  },

  getRoleByRoleId: async roleId => {
    return await AdminRoles.findOne({ roleId });
  },

  getAdminRoleById: async id => {
    return await AdminRoles.findById(id);
  },

  getAdminRoleByCode: async code => {
    return await AdminRoles.findOne({ code });
  },

  getAdminRoleByName: async name => {
    return await AdminRoles.findOne({ role: toRoleType(name) });
  },

  getRoleWithPermissions: async roleId => {
    return await AdminRoles.findOne({ roleId }).populate(withResourceNames);
  },

  // ! includes soft-deleted roles: `role` is unique across all of them
  getRoleByTypeIncludingDeleted: async name => {
    return await AdminRoles.findOne({
      role: toRoleType(name),
      isDeleted: { $in: [true, false, null] },
    });
  },

  // ! throws 409 when the name is taken by another role, live or deleted;
  // pass the role's own id when renaming so it doesn't clash with itself
  confirmThatRoleDoesNotExist: async (name, label, exceptRoleId) => {
    const existingRole =
      await AdminRoleService.getRoleByTypeIncludingDeleted(name);

    if (existingRole && existingRole.roleId !== exceptRoleId) {
      logger.warn(
        `${labelEnum.CURRENT_TIME_STAMP}-${label}-${adminMessagesEnum.ROLE_EXISTS}`
      );
      throw new ErrorResponse(
        adminMessagesEnum.ROLE_EXISTS,
        statusEnum.statusCode.HTTP_CONFLICT
      );
    }
  },

  // * a random 5-letter code no live role is using yet
  generateUniqueAdminRoleCode: async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = createRoleCode();
      if (!(await AdminRoles.exists({ code }))) {
        return code;
      }
    }
    throw new Error("Could not generate a unique role code");
  },

  // > the role's default permission set, one row per resource
  getRolePermissions: async roleId => {
    return await AdminRolePermission.find({ roleId });
  },

  getAdminResources: async () => {
    return await AdminResource.find().select("resourceId name -_id").lean();
  },

  getResourcesByResourceIds: async resourceIds => {
    return await AdminResource.find({ resourceId: { $in: resourceIds } });
  },

  // & checks a permissions payload before it is saved: every resource must
  // exist (404) and appear once (409); returns the resources for their names
  validateRolePermissionsArray: async (permissions, label) => {
    const resourceIds = permissions.map(({ resourceId }) => resourceId);

    const duplicateId = resourceIds.find(
      (id, index) => resourceIds.indexOf(id) !== index
    );
    if (duplicateId) {
      logger.warn(
        `${labelEnum.CURRENT_TIME_STAMP}-${label}-${adminMessagesEnum.RESOURCE_REPEATED(duplicateId)}`
      );
      throw new ErrorResponse(
        adminMessagesEnum.RESOURCE_REPEATED(duplicateId),
        statusEnum.statusCode.HTTP_CONFLICT
      );
    }

    const resources =
      await AdminRoleService.getResourcesByResourceIds(resourceIds);
    const foundIds = new Set(resources.map(({ resourceId }) => resourceId));
    const missingIds = resourceIds.filter(id => !foundIds.has(id));

    if (missingIds.length > 0) {
      logger.warn(
        `${labelEnum.CURRENT_TIME_STAMP}-${label}-${adminMessagesEnum.RESOURCES_NOT_FOUND(missingIds)}`
      );
      throw new ErrorResponse(
        adminMessagesEnum.RESOURCES_NOT_FOUND(missingIds),
        statusEnum.statusCode.HTTP_NOT_FOUND
      );
    }

    return resources;
  },

  // ' every resource with the role's actions on it, [] where it has none, so
  // an admin screen can show the full permission grid
  processRoleBasedPermissions: (rolePermissions, adminResources) => {
    const actionsByResource = new Map(
      rolePermissions.map(row => [row.resourceId, row.permissions])
    );

    return adminResources.map(({ resourceId, name }) => ({
      resourceId,
      name,
      permissions: actionsByResource.get(resourceId) ?? [],
    }));
  },

  updateAdminRoleStatus: async (role, status) => {
    role.status = status;
    return await role.save();
  },

  // ? soft deletes the role and its default permissions together
  deleteAdminRole: async role => {
    await role.softDelete();
    await AdminRoleService.softDeleteRolePermissions(role.roleId);
  },

  countAdminsWithRole: async roleId => {
    return await AdminAuth.countDocuments({ roleId });
  },

  // # admins holding the role, filtered by name/email/phone search, status and
  // creation date; never returns passwords or tokens
  getAdminsByRole: async ({
    roleId,
    search,
    status,
    startDate,
    endDate,
    page,
    limit,
  }) => {
    const filter = {
      roleId,
      ...listFilter({ search, status, startDate, endDate }, [
        "first_name",
        "last_name",
        "email",
        "phone_number",
      ]),
    };
    const { perPage, currentPage, skip } = pageOf(page, limit);

    const [admins, total] = await Promise.all([
      AdminAuth.find(filter)
        .select(
          "adminId first_name last_name email phone_number role roleId status createdAt updatedAt -_id"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage),
      AdminAuth.countDocuments(filter),
    ]);

    return { admins, total, resultPerPage: perPage, currentPage };
  },

  // > permission rows copy the role type, so keep them in step on rename
  renameRolePermissions: async (roleId, roleType) => {
    return await AdminRolePermission.updateMany(
      { roleId },
      { role_type: roleType }
    );
  },

  softDeleteRolePermissions: async roleId => {
    return await AdminRolePermission.updateMany(
      { roleId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() }
    );
  },

  // * one row per role + resource: replaces the actions, and revives a soft-deleted row.
  // bulkWrite skips the soft-delete find hook, so the unique index can't trip on a deleted row
  upsertRolePermissions: async (role, permissions, createRolePermId) => {
    return await AdminRolePermission.bulkWrite(
      permissions.map(({ resourceId, actions }) => ({
        updateOne: {
          filter: { roleId: role.roleId, resourceId },
          update: {
            $set: {
              role_type: role.role,
              permissions: actions,
              isDeleted: false,
              deletedAt: null,
            },
            $setOnInsert: { rolePermId: createRolePermId() },
          },
          upsert: true,
        },
      }))
    );
  },
};

export default AdminRoleService;
