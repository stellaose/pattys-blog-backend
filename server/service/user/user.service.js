import { Auth } from "../../models/auth.model.js";

const UserService = {
  getPublicUserByUserId: async userId => {
    return await Auth.findOne({ userId })
      .select("userId first_name last_name user_name gender bio createdAt -_id")
      .lean();
  },
};

export default UserService;
