/* eslint-disable no-undef */
import { ContactController } from "../controller/user/contact.controller.js";
import { Contact } from "../models/user/contact.model.js";
import ContactService from "../service/user/contact.service.js";
import { sendEmail } from "../utils/mailer.js";
import AuthMiddleware from "../middleware/AuthMiddleware.js";
import { AuthService } from "../service/user/auth.service.js";
import { messagesEnum } from "../enums/index.js";

// ! mock contact schema
jest.mock("../models/user/contact.model.js", () => ({
  Contact: { create: jest.fn() },
}));

// > mock contact service
jest.mock("../service/user/contact.service.js", () => ({
  __esModule: true,
  default: {
    getAllContactMessages: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

// < mock query helper so no database query runs
jest.mock("../utils/apiFeatures.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => {
    const features = {
      query: { getFilter: () => ({}) },
      search: () => features,
      filter: () => features,
      sort: () => features,
      pagination: () => {
        features.query = Promise.resolve([
          { contactId: "contact-1", name: "Ada" },
        ]);
        return features;
      },
    };
    return features;
  }),
}));

// ? mock mailer
jest.mock("../utils/mailer.js", () => ({
  sendEmail: jest.fn(),
}));

// ' mock auth service used by the role middleware
jest.mock("../service/user/auth.service.js", () => ({
  AuthService: { getUserByUserId: jest.fn() },
}));

// = mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// * nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({ nanoid: () => "abc123" }));

// & a valid contact form submission
const payload = {
  name: "Ada Obi",
  email: "ada@example.com",
  topic: "Feedback",
  message: "Loving Pattys so far.",
};

// - fake Express response that records status() and json() calls
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// + fake saved Mongoose document with a stubbed save()
const makeContact = () => ({
  ...payload,
  contactId: "contact-abc123",
  isEmailSent: false,
  save: jest.fn(),
});

describe("ContactController.createContactMessage", () => {
  const originalReceiver = process.env.CONTACT_RECEIVER_EMAIL;

  // = every test starts with a receiver address configured
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CONTACT_RECEIVER_EMAIL = "inbox@pattys.test";
  });

  // - restore the real receiver address once these tests are done
  afterAll(() => {
    process.env.CONTACT_RECEIVER_EMAIL = originalReceiver;
  });

  // ' Save email
  it("saves the message, e-mails the inbox and replies 201", async () => {
    const contact = makeContact();
    Contact.create.mockResolvedValue(contact);
    sendEmail.mockResolvedValue({});
    const res = makeRes();
    const next = jest.fn();

    await ContactController.createContactMessage({ body: payload }, res, next);

    expect(Contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ ...payload, contactId: "contact-abc123" })
    );
    // > replyTo lets the team answer the visitor straight from their inbox
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "inbox@pattys.test",
        replyTo: "ada@example.com",
        subject: "Pattys contact form: Feedback",
      })
    );
    // < the saved record notes that the e-mail went out
    expect(contact.isEmailSent).toBe(true);
    expect(contact.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: messagesEnum.CONTACT_MESSAGE_SENT_SUCCESSFULLY,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ! Escape HTML
  it("escapes HTML from the visitor in the e-mail body", async () => {
    // & echo back what was submitted so the e-mail is built from the visitor input
    Contact.create.mockImplementation(async doc => ({
      ...doc,
      save: jest.fn(),
    }));
    sendEmail.mockResolvedValue({});

    await ContactController.createContactMessage(
      { body: { ...payload, message: "<script>alert(1)</script>" } },
      makeRes(),
      jest.fn()
    );

    // ? a <script> typed by the visitor must arrive as plain text, never as markup
    const { html } = sendEmail.mock.calls[0][0];
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  // # E-mail failure
  it("still saves and replies 201 when the e-mail fails", async () => {
    const contact = makeContact();
    Contact.create.mockResolvedValue(contact);
    // $ simulate the mail provider being unavailable
    sendEmail.mockRejectedValue(new Error("SMTP down"));
    const res = makeRes();
    const next = jest.fn();

    await ContactController.createContactMessage({ body: payload }, res, next);

    // % the message is still saved and the visitor still gets a success reply
    expect(contact.isEmailSent).toBe(false);
    expect(contact.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  // ~ No receiver
  it("skips the e-mail when no receiver address is configured", async () => {
    // ^ no inbox configured, so nothing to send to
    delete process.env.CONTACT_RECEIVER_EMAIL;
    Contact.create.mockResolvedValue(makeContact());
    const res = makeRes();

    await ContactController.createContactMessage(
      { body: payload },
      res,
      jest.fn()
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // * Database error
  it("passes database errors to the error middleware", async () => {
    const error = new Error("db down");
    Contact.create.mockRejectedValue(error);
    const next = jest.fn();

    await ContactController.createContactMessage(
      { body: payload },
      makeRes(),
      next
    );

    // + the error goes to the error middleware instead of a success reply
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("ContactController.getAllContactMessages", () => {
  // ; Get all messages
  it("returns the messages with pagination", async () => {
    // > one stored message; the mocked query helper returns it as the page
    ContactService.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    const next = jest.fn();

    await ContactController.getAllContactMessages({ query: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: messagesEnum.CONTACT_MESSAGES_FETCHED_SUCCESSFULLY,
        contacts: [{ contactId: "contact-1", name: "Ada" }],
        // < pagination is worked out from the total count and page size
        pagination: expect.objectContaining({
          totalMessages: 1,
          currentPage: 1,
          totalPages: 1,
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("AuthMiddleware.requireRole", () => {
  // = same roles the GET /contact route requires
  const middleware = AuthMiddleware.requireRole("admin", "superAdmin");

  // - reset the user lookup between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ' Admin access
  it("lets an admin through", async () => {
    AuthService.getUserByUserId.mockResolvedValue({ role: "admin" });
    const next = jest.fn();

    await middleware({ userId: "user-1" }, makeRes(), next);

    // & next() with no argument means the request carries on to the controller
    expect(next).toHaveBeenCalledWith();
  });

  // ! Regular user
  it("rejects a regular user with 403", async () => {
    // ? a normal account, not an admin
    AuthService.getUserByUserId.mockResolvedValue({ role: "user" });
    const next = jest.fn();

    await middleware({ userId: "user-1" }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  // # Unknown user
  it("rejects an unknown user", async () => {
    // $ the token belongs to an account that no longer exists
    AuthService.getUserByUserId.mockResolvedValue(null);
    const next = jest.fn();

    await middleware({ userId: "missing" }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});
