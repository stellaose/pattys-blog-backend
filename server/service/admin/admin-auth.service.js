import { AdminAuth } from "../../models/admin/admin-auth.model.js";

export const AdminAuthService = {
  getAdminByEmail: async email => {
    return await AdminAuth.findOne({
      email: email.toLowerCase(),
    });
  },

  getAdminByAdminId: async adminId => {
    return await AdminAuth.findOne({ adminId });
  },
};
