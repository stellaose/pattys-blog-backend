import { Contact } from "../../models/user/contact.model.js";

const ContactService = {
  getAllContactMessages: () => {
    return Contact.find();
  },

  countDocuments: async filter => {
    return await Contact.countDocuments(filter);
  },
};

export default ContactService;
