import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import { AdminUserPermission } from "../../models/admin/admin-user-permissions.model.js";
import "../../models/admin/admin-roles.model.js";
import "../../models/admin/admin-resources.model.js";

export const AdminAuthService = {
  getAdminByEmail: async email => {
    return await AdminAuth.findOne({
      email: email.toLowerCase(),
    });
  },

  // ! the soft-delete plugin hides deleted admins, so ask for them explicitly
  getDeletedAdminByEmail: async email => {
    return await AdminAuth.findOne({
      email: email.toLowerCase(),
      isDeleted: true,
    });
  },

  getAdminByAdminId: async adminId => {
    return await AdminAuth.findOne({ adminId });
  },

  // > returns the query unawaited so ApiFeatures can chain search/sort/paging onto it
  getAllAdmins: () => {
    return AdminAuth.find()
      .select(
        "adminId first_name last_name email role roleId status createdAt updatedAt -_id"
      )
      .populate({ path: "adminRole", select: "name role -_id" });
  },

  countDocuments: async filter => {
    return await AdminAuth.countDocuments(filter);
  },

  getAdminPermissions: async adminId => {
    return await AdminUserPermission.find({ adminId })
      .select("resourceId permissions -_id")
      .populate({ path: "resource", select: "name -_id" });
  },

  // * full replace: hard delete, since the (adminId, resourceId) index would block re-adding a soft-deleted row
  replaceAdminPermissions: async (
    admin,
    role,
    permissions,
    createPermId,
    session
  ) => {
    await AdminUserPermission.deleteMany(
      { adminId: admin.adminId },
      { session }
    );

    if (permissions.length === 0) {
      return [];
    }

    return await AdminUserPermission.insertMany(
      permissions.map(({ resourceId, actions }) => ({
        rolePermId: createPermId(),
        adminId: admin.adminId,
        roleId: role.roleId,
        role_type: role.role,
        resourceId,
        permissions: actions,
      })),
      { session }
    );
  },

  softDeleteAdminPermissions: async (adminId, session) => {
    return await AdminUserPermission.updateMany(
      { adminId, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { session }
    );
  },
};
