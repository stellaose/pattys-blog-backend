import jwt from "jsonwebtoken";
import { AdminAuthController } from "../controller/admin/admin-auth.controller.js";
import { AdminActivityLog } from "../models/admin/admin-activity-log.model.js";
import { AdminAuthService } from "../service/admin/admin-auth.service.js";
import tokenService from "../utils/token.js";
import { adminMessagesEnum, messagesEnum } from "../enums/index.js";

// * fixed secrets so the real token service signs and verifies predictably
process.env.JWT_SECRET = "test-jwt-secret";
process.env.REFRESH_JWT_SECRET = "test-refresh-secret";
process.env.EMAIL_SECRET = "test-email-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.REFRESH_JWT_EXPIRES_IN = "7d";

// # mock activity log model so tracking never touches the database
jest.mock("../models/admin/admin-activity-log.model.js", () => ({
  AdminActivityLog: { create: jest.fn().mockResolvedValue({}) },
}));

// > mock admin lookups
jest.mock("../service/admin/admin-auth.service.js", () => ({
  AdminAuthService: {
    getAdminByEmail: jest.fn(),
    getAdminByAdminId: jest.fn(),
  },
}));

// ? Mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ' Mock bcrypt: a hash is "hashed:<password>"
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async password => `hashed:${password}`),
    compare: jest.fn(async (password, hash) => hash === `hashed:${password}`),
  },
}));

// =  nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({
  nanoid: () => "abc123",
  customAlphabet: () => () => "ABCDE",
}));

const TEST_OTP = 654321;
const IN_FIFTEEN_MINUTES = () => new Date(Date.now() + 15 * 60 * 1000);

// & fake Mongoose admin document with a stubbed save()
const makeAdmin = (overrides = {}) => {
  const admin = {
    _id: "mongo-id-1",
    adminId: "admin-1",
    first_name: "Ada",
    last_name: "Obi",
    email: "ada@example.com",
    password: "hashed:secret123",
    role: "editor",
    status: "active",
    is_created_password: true,
    is_completed_profile: true,
    emailVerificationTokenCount: 0,
    inValidEmailVerificationCount: 0,
    ...overrides,
  };
  admin.save = jest.fn().mockResolvedValue(admin);
  return admin;
};

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// ~ tracking is fire-and-forget, so let its write settle
const flushTracking = () => new Promise(resolve => setImmediate(resolve));

const call = async (handler, req) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ body: {}, params: {}, ...req }, res, next);
  await flushTracking();
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const expectError = (next, statusCode, message) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error.statusCode).toBe(statusCode);
  if (message !== undefined) expect(error.message).toBe(message);
};

const expectTracked = fields => {
  expect(AdminActivityLog.create).toHaveBeenCalledWith(
    expect.objectContaining(fields)
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ` POST /admin/auth/login
describe("AdminAuthController.login", () => {
  test("issues a login code for valid credentials and tracks it", async () => {
    const admin = makeAdmin();
    AdminAuthService.getAdminByEmail.mockResolvedValue(admin);

    const { res, next, body } = await call(AdminAuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(admin.emailVerificationToken).toBe(TEST_OTP);
    expect(admin.emailVerificationTokenCount).toBe(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.admin.otp).toBe(TEST_OTP);
    expect(body).not.toHaveProperty("token");
    expectTracked({
      adminId: "admin-1",
      activity_type: "ADMLGR",
      activity_status: "success",
      description: "Ada Obi initiated a login request",
    });
  });

  test("rejects an unknown email without tracking", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(null);

    const { next } = await call(AdminAuthController.login, {
      body: { email: "nobody@example.com", password: "secret123" },
    });

    expectError(next, 400, adminMessagesEnum.INVALID_CREDENTIALS);
    expect(AdminActivityLog.create).not.toHaveBeenCalled();
  });

  test("rejects a wrong password and tracks the failure", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(makeAdmin());

    const { next } = await call(AdminAuthController.login, {
      body: { email: "ada@example.com", password: "wrong" },
    });

    expectError(next, 400, adminMessagesEnum.INVALID_CREDENTIALS);
    expectTracked({ activity_type: "ADMLGR", activity_status: "failed" });
  });

  test("rejects with 403 when the account is suspended", async () => {
    const admin = makeAdmin({ status: "suspended" });
    AdminAuthService.getAdminByEmail.mockResolvedValue(admin);

    const { next } = await call(AdminAuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expectError(next, 403, adminMessagesEnum.ACCOUNT_NOT_ACTIVE("suspended"));
    expect(admin.save).not.toHaveBeenCalled();
  });

  test("lets a pending (just invited) admin request a code", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(
      makeAdmin({ status: "pending", is_created_password: false })
    );

    const { next } = await call(AdminAuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expect(next).not.toHaveBeenCalled();
  });
});

// ; POST /admin/auth/verify-login
describe("AdminAuthController.verifyLogin", () => {
  test("returns an admin token that authAdmin can read, and clears the code", async () => {
    const admin = makeAdmin({
      emailVerificationToken: TEST_OTP,
      emailVerificationTokenExpires: IN_FIFTEEN_MINUTES(),
      inValidEmailVerificationCount: 2,
    });
    AdminAuthService.getAdminByEmail.mockResolvedValue(admin);

    const { next, body } = await call(AdminAuthController.verifyLogin, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });

    expect(next).not.toHaveBeenCalled();
    expect(jwt.verify(body.token, "test-jwt-secret").adminId).toBe("admin-1");
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(admin.emailVerificationToken).toBeUndefined();
    expect(admin.inValidEmailVerificationCount).toBe(0);
    expect(body.admin).not.toHaveProperty("password");
    expectTracked({ activity_type: "VRYLGOP", activity_status: "success" });
  });

  test("rejects a wrong code and counts the attempt", async () => {
    const admin = makeAdmin({
      emailVerificationToken: TEST_OTP,
      emailVerificationTokenExpires: IN_FIFTEEN_MINUTES(),
    });
    AdminAuthService.getAdminByEmail.mockResolvedValue(admin);

    const { next } = await call(AdminAuthController.verifyLogin, {
      body: { email: "ada@example.com", code: 111111 },
    });

    expectError(next, 400, messagesEnum.INVALID_VERIFICATION_CODE);
    expect(admin.inValidEmailVerificationCount).toBe(1);
    expectTracked({ activity_type: "VRYLGOP", activity_status: "failed" });
  });

  test("rejects an expired code", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(
      makeAdmin({
        emailVerificationToken: TEST_OTP,
        emailVerificationTokenExpires: new Date(Date.now() - 1000),
      })
    );

    const { next } = await call(AdminAuthController.verifyLogin, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_EXPIRED);
  });

  test("rejects when no login was requested", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(makeAdmin());

    const { next } = await call(AdminAuthController.verifyLogin, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_NOT_FOUND);
  });
});

// ' POST /admin/auth/create-password
describe("AdminAuthController.createPassword", () => {
  test("replaces the temporary password and activates a pending admin", async () => {
    const admin = makeAdmin({
      status: "pending",
      is_created_password: false,
      password: "hashed:temp-pass",
    });
    AdminAuthService.getAdminByAdminId.mockResolvedValue(admin);

    const { next } = await call(AdminAuthController.createPassword, {
      adminId: "admin-1",
      body: { password: "brand-new-pass" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(admin.password).toBe("hashed:brand-new-pass");
    expect(admin.is_created_password).toBe(true);
    expect(admin.status).toBe("active");
    expectTracked({ activity_type: "ADMCRPD", activity_status: "success" });
  });

  test("rejects with 400 when the password was already created", async () => {
    AdminAuthService.getAdminByAdminId.mockResolvedValue(makeAdmin());

    const { next } = await call(AdminAuthController.createPassword, {
      adminId: "admin-1",
      body: { password: "brand-new-pass" },
    });

    expectError(next, 400, adminMessagesEnum.PASSWORD_ALREADY_CREATED);
  });

  test("rejects reusing the temporary password", async () => {
    AdminAuthService.getAdminByAdminId.mockResolvedValue(
      makeAdmin({ is_created_password: false, password: "hashed:temp-pass" })
    );

    const { next } = await call(AdminAuthController.createPassword, {
      adminId: "admin-1",
      body: { password: "temp-pass" },
    });

    expectError(next, 400, messagesEnum.NEW_PASSWORD_SAME_AS_OLD);
  });
});

// * forgot-password -> verify-forgot-password -> reset-password
describe("AdminAuthController password reset flow", () => {
  test("walks from forgot password to a new password", async () => {
    const admin = makeAdmin();
    AdminAuthService.getAdminByEmail.mockResolvedValue(admin);
    AdminAuthService.getAdminByAdminId.mockResolvedValue(admin);

    const forgot = await call(AdminAuthController.forgotPassword, {
      body: { email: "ada@example.com" },
    });
    expect(forgot.body.admin.otp).toBe(TEST_OTP);

    const verify = await call(AdminAuthController.verifyForgotPassword, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });
    expect(admin.passwordToken).toBeUndefined();
    const { passwordResetToken } = verify.body;

    const reset = await call(AdminAuthController.resetPassword, {
      body: { passwordResetToken, password: "new-secret-1" },
    });

    expect(reset.next).not.toHaveBeenCalled();
    expect(admin.password).toBe("hashed:new-secret-1");
    expectTracked({ activity_type: "ADMFGPD", activity_status: "success" });
    expectTracked({ activity_type: "VRYRPDOP", activity_status: "success" });
    expectTracked({ activity_type: "ADRSPD", activity_status: "success" });
  });

  test("the reset token cannot be used as a login token", async () => {
    const resetToken =
      tokenService.generateAdminResetPasswordToken(makeAdmin());

    expect(
      tokenService.verifyToken(resetToken, "test-jwt-secret").success
    ).toBe(false);
  });

  test("a login token cannot be used to reset a password", async () => {
    const loginToken = tokenService.generateAdminJwtToken(makeAdmin());

    const { next } = await call(AdminAuthController.resetPassword, {
      body: { passwordResetToken: loginToken, password: "new-secret-1" },
    });

    expectError(next, 400, adminMessagesEnum.INVALID_RESET_TOKEN);
  });

  test("rejects a wrong reset code", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(
      makeAdmin({
        passwordToken: TEST_OTP,
        passwordTokenExpires: IN_FIFTEEN_MINUTES(),
      })
    );

    const { next } = await call(AdminAuthController.verifyForgotPassword, {
      body: { email: "ada@example.com", code: 111111 },
    });

    expectError(next, 400, messagesEnum.INVALID_VERIFICATION_CODE);
  });

  test("forgot password rejects with 404 for an unknown email", async () => {
    AdminAuthService.getAdminByEmail.mockResolvedValue(null);

    const { next } = await call(AdminAuthController.forgotPassword, {
      body: { email: "nobody@example.com" },
    });

    expectError(next, 404, adminMessagesEnum.ADMIN_NOT_FOUND);
  });
});

// - PATCH /admin/auth/change-password
describe("AdminAuthController.changePassword", () => {
  test("changes the password when the old one matches", async () => {
    const admin = makeAdmin();
    AdminAuthService.getAdminByAdminId.mockResolvedValue(admin);

    const { next } = await call(AdminAuthController.changePassword, {
      adminId: "admin-1",
      body: { old_password: "secret123", password: "new-secret-1" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(admin.password).toBe("hashed:new-secret-1");
    expectTracked({ activity_type: "ADCHPD", activity_status: "success" });
  });

  test("rejects a wrong old password", async () => {
    AdminAuthService.getAdminByAdminId.mockResolvedValue(makeAdmin());

    const { next } = await call(AdminAuthController.changePassword, {
      adminId: "admin-1",
      body: { old_password: "wrong", password: "new-secret-1" },
    });

    expectError(next, 400, adminMessagesEnum.INVALID_CREDENTIALS);
  });

  test("rejects a new password equal to the old one", async () => {
    AdminAuthService.getAdminByAdminId.mockResolvedValue(makeAdmin());

    const { next } = await call(AdminAuthController.changePassword, {
      adminId: "admin-1",
      body: { old_password: "secret123", password: "secret123" },
    });

    expectError(next, 400, messagesEnum.NEW_PASSWORD_SAME_AS_OLD);
  });
});

// = POST /admin/auth/logout
describe("AdminAuthController.logout", () => {
  test("clears any pending login code and tracks the logout", async () => {
    const admin = makeAdmin({ emailVerificationToken: TEST_OTP });
    AdminAuthService.getAdminByAdminId.mockResolvedValue(admin);

    const { res, next } = await call(AdminAuthController.logout, {
      adminId: "admin-1",
    });

    expect(next).not.toHaveBeenCalled();
    expect(admin.emailVerificationToken).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
    expectTracked({
      activity_type: "ADMLGOUT",
      activity_status: "success",
      description: "Ada Obi logged out",
    });
  });
});
