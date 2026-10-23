import { AdminResource } from "../../models/admin/admin-resources.model.js";
import "../../models/admin/admin-permissions.model.js";

const AdminResourceService = {
  // > returns the query unawaited so ApiFeatures can chain search/sort/paging onto it;
  // the soft-delete plugin already leaves deleted resources out
  getAllResources: () => {
    return AdminResource.find();
  },

  getAllResourcesIncludingDeleted: async () => {
    return await AdminResource.find();
  },

  countDocuments: async filter => {
    return await AdminResource.countDocuments(filter);
  },

  getResourceByResourceId: async resourceId => {
    return await AdminResource.findOne({ resourceId });
  },

  getResourceWithPermissions: async resourceId => {
    return await AdminResource.findOne({ resourceId }).populate("permissions");
  },

  getResourceByNameIncludingDeleted: async name => {
    return await AdminResource.findOne({
      name: name.trim().toLowerCase(),
      isDeleted: { $in: [true, false, null] },
    });
  },
};

export default AdminResourceService;
