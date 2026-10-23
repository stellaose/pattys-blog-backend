import { Auth } from "../../models/user/auth.model.js";

export const AuthService = {
  getUserByEmail: async email => {
    return await Auth.findOne({
      email: email.toLowerCase(),
    });
  },

  getUserByUsername: async username => {
    return await Auth.findOne({ user_name: username.toLowerCase() });
  },

  getUserByUserId: async userId => {
    return await Auth.findOne({ userId });
  },

  getAuthorDetailsByUserIds: async userIds => {
    const authors = await Auth.find({ userId: { $in: [...new Set(userIds)] } })
      .select("userId first_name last_name user_name -_id")
      .lean();
    return new Map(authors.map(author => [author.userId, author]));
  },
};
