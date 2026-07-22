import { Auth } from "../../models/auth.model.js";

const AuthService = {
  getUserByEmail: async email => {
    return await Auth.findOne({ email: email.toLowerCase() });
  },

  getUserByUsername: async username => {
    return await Auth.findOne({ username: username.toLowerCase() });
  },
  
  getUserByUserId: async userId => {
    return await Auth.findOne({ userId });
  }
};

export default AuthService;
