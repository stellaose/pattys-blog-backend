/* eslint-disable no-undef */
import { Contact } from "../../models/user/contact.model.js";
import ContactService from "../../service/user/contact.service.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import { sendEmail } from "../../utils/mailer.js";
import { contactUsMail } from "../../utils/contactMail.js";
import logger from "../../logger/logger.js";
import { labelEnum, messagesEnum, statusEnum } from "../../enums/index.js";
import { createId } from "../../utils/helper.js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const notifyContactInbox = async contact => {
  const receiver = process.env.CONTACT_RECEIVER_EMAIL?.trim();

  if (!receiver) {
    logger.warn(
      `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_CONTACT_MESSAGE}-${messagesEnum.CONTACT_RECEIVER_NOT_SET}`
    );
    return false;
  }

  try {
    await sendEmail({
      to: receiver,
      replyTo: contact.email,
      ...contactUsMail(contact),
    });
    return true;
  } catch (error) {
    logger.error(
      `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_CONTACT_MESSAGE}-${messagesEnum.CONTACT_EMAIL_NOT_SENT}`,
      error.message
    );
    return false;
  }
};

export const ContactController = {
  createContactMessage: async (req, res, next) => {
    try {
      const { name, email, topic, message } = req.body;

      const contact = await Contact.create({
        contactId: createId("contact", 24),
        name,
        email,
        topic,
        message,
      });

      const isEmailSent = await notifyContactInbox(contact);

      if (isEmailSent) {
        contact.isEmailSent = true;
        await contact.save();
      }

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_CONTACT_MESSAGE}-${messagesEnum.CONTACT_MESSAGE_SENT_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_CREATED).json({
        code: statusEnum.statusCode.HTTP_CREATED,
        success: true,
        message: messagesEnum.CONTACT_MESSAGE_SENT_SUCCESSFULLY,
        contact,
      });
    } catch (error) {
      logger.error(
        `Create contact message failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.CREATE_CONTACT_MESSAGE}`,
        error.message
      );
      next(error);
    }
  },

  getAllContactMessages: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }

      const resultPerPage = Math.min(Number(queryParams.limit) || 20, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        ContactService.getAllContactMessages(),
        queryParams,
        {
          searchableFields: ["name", "email", "topic", "message"],
          filterAllowlist: ["topic"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const messagesCount = await ContactService.countDocuments(filter);

      features.pagination(resultPerPage);
      const contacts = await features.query;

      logger.info(
        `${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ALL_CONTACT_MESSAGES}-${messagesEnum.CONTACT_MESSAGES_FETCHED_SUCCESSFULLY}`
      );

      return res.status(statusEnum.statusCode.HTTP_OK).json({
        code: statusEnum.statusCode.HTTP_OK,
        success: true,
        message: messagesEnum.CONTACT_MESSAGES_FETCHED_SUCCESSFULLY,
        contacts,
        pagination: {
          count: contacts.length,
          totalMessages: messagesCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(messagesCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      logger.error(
        `Get contact messages failed::${labelEnum.CURRENT_TIME_STAMP}-${labelEnum.GET_ALL_CONTACT_MESSAGES}`,
        error.message
      );
      next(error);
    }
  },
};
