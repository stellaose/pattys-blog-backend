import bcrypt from "bcryptjs";
import { AuthController } from "../controller/user/auth.controller.js";
import { Auth } from "../models/user/auth.model.js";
import { AuthService } from "../service/user/auth.service.js";
import tokenService from "../utils/token.js";
import { messagesEnum } from "../enums/index.js";
import { UserActivityLog } from "../models/user/user-activity-log.model.js";


// ! mock  auth schema
jest.mock("../models/user/auth.model.js", () => ({
  Auth: { create: jest.fn() },
}));

// > mock auth service
jest.mock("../service/user/auth.service.js", () => ({
  AuthService: {
    getUserByEmail: jest.fn(),
    getUserByUsername: jest.fn(),
    getUserByUserId: jest.fn(),
  },
}));

// < mock jwt token
jest.mock("../utils/token.js", () => ({
  __esModule: true,
  default: {
    generateJwtToken: jest.fn(() => "access-token"),
    generateRefreshJwtToken: jest.fn(() => "refresh-token"),
  },
}));

// ? Mock logger
jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ' Mock bcrypt
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    genSaltSync: jest.fn(() => "salt"),
    hashSync: jest.fn(password => `hashed:${password}`),
    compare: jest.fn(),
  },
}));

// # mock activity log model so tracking never touches the database
jest.mock("../models/user/user-activity-log.model.js", () => ({
  UserActivityLog: { create: jest.fn().mockResolvedValue({}) },
}));

// =  nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({ nanoid: () => "abc123" }));

// * fixed OTP the controller issues while email sending is disabled
const TEST_OTP = 123456;
const TEN_MINUTES = 10 * 60 * 1000;

// & fake Mongoose user document with stubbed save() and toObject()
const makeUser = (overrides = {}) => {
  const user = {
    _id: "mongo-id-1",
    userId: "user-abc123",
    first_name: "Ada",
    last_name: "Obi",
    user_name: "ada",
    email: "ada@example.com",
    phone_number: "08012345678",
    password: "hashed:secret123",
    isEmailVerified: true,
    ...overrides,
  };
  user.save = jest.fn().mockResolvedValue(user);
  user.toObject = jest.fn(() => {
    const { save: _save, toObject: _toObject, ...plain } = user;
    return { ...plain };
  });
  return user;
};

// + fake Express response whose methods are chainable spies
const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);
  return res;
};

// # runs a controller handler and returns the response, next() and JSON body
const call = async (handler, req) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ body: {}, params: {}, ...req }, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

// $ asserts the handler passed one error with this status (and message) to next()
const expectError = (next, statusCode, message) => {
  expect(next).toHaveBeenCalledTimes(1);
  const error = next.mock.calls[0][0];
  expect(error.statusCode).toBe(statusCode);
  if (message !== undefined) expect(error.message).toBe(message);
};

// * reset every mock's calls and return values between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// ` POST /auth/signup
describe("AuthController.signup", () => {
  // & a request body that passes every signup check
  const validBody = {
    first_name: "Ada",
    last_name: "Obi",
    user_name: "ada",
    email: "Ada@Example.com",
    password: "secret123",
    phone_number: "08012345678",
  };

  // ~ email and username are free, so the user is created, saved with the OTP, and returned without secrets
  test("creates an unverified user with a hashed password and the test OTP", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);
    AuthService.getUserByUsername.mockResolvedValue(null);
    const created = makeUser({ isEmailVerified: false });
    Auth.create.mockResolvedValue(created);

    const { res, next, body } = await call(AuthController.signup, {
      body: validBody,
    });

    expect(next).not.toHaveBeenCalled();
    expect(Auth.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        password: "hashed:secret123",
        isEmailVerified: false,
        role: "user",
      })
    );
    expect(created.emailVerificationToken).toBe(TEST_OTP);
    expect(created.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(body.success).toBe(true);
    expect(body.user).not.toHaveProperty("password");
    expect(body.user).not.toHaveProperty("emailVerificationToken");
  });

  // @ each row breaks one required field; no user may be created
  test.each([
    ["email is missing", { email: undefined }],
    ["email is invalid", { email: "not-an-email" }],
    ["password is shorter than 6 characters", { password: "123" }],
    ["user_name is missing", { user_name: undefined }],
    ["phone_number is missing", { phone_number: undefined }],
  ])("rejects with 400 when %s", async (_label, override) => {
    const { next } = await call(AuthController.signup, {
      body: { ...validBody, ...override },
    });

    expectError(next, 400);
    expect(Auth.create).not.toHaveBeenCalled();
  });

  // - an existing user is found by email, so signup stops before creating anyone
  test("rejects with 409 when the email is already registered", async () => {
    AuthService.getUserByEmail.mockResolvedValue(makeUser());

    const { next } = await call(AuthController.signup, { body: validBody });

    expectError(next, 409, messagesEnum.EMAIL_EXISTS);
    expect(Auth.create).not.toHaveBeenCalled();
  });

  // ' email is free but the username lookup finds a user
  test("rejects with 400 when the username is taken", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);
    AuthService.getUserByUsername.mockResolvedValue(makeUser());

    const { next } = await call(AuthController.signup, { body: validBody });

    expectError(next, 400);
    expect(Auth.create).not.toHaveBeenCalled();
  });
});

// # POST /auth/verify-email
describe("AuthController.verifyEmail", () => {
  // & an unverified user holding a valid, unexpired signup OTP
  const unverified = overrides =>
    makeUser({
      isEmailVerified: false,
      emailVerificationToken: TEST_OTP,
      emailVerificationTokenExpires: new Date(Date.now() + TEN_MINUTES),
      ...overrides,
    });

  // ? the frontend may send the code as a number or a string; both must verify
  test.each([
    ["a number", TEST_OTP],
    ["a string", String(TEST_OTP)],
  ])("verifies the email when the code is sent as %s", async (_label, code) => {
    const user = unverified();
    AuthService.getUserByEmail.mockResolvedValue(user);

    const { res, next, body } = await call(AuthController.verifyEmail, {
      body: { email: user.email, code },
    });

    expect(next).not.toHaveBeenCalled();
    expect(user.isEmailVerified).toBe(true);
    expect(user.emailVerificationToken).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(messagesEnum.EMAIL_VERIFIED_SUCCESSFULLY);
    expect(body.user).not.toHaveProperty("password");
  });

  // + the email fails format validation before any lookup
  test("rejects with 400 when the email is invalid", async () => {
    const { next } = await call(AuthController.verifyEmail, {
      body: { email: "nope", code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.EMAIL_REQUIRED);
  });

  // = no code in the body
  test("rejects with 400 when the code is missing", async () => {
    const { next } = await call(AuthController.verifyEmail, {
      body: { email: "ada@example.com" },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_REQUIRED);
  });

  // - no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);

    const { next } = await call(AuthController.verifyEmail, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // > verifying twice is not allowed
  test("rejects with 400 when the email is already verified", async () => {
    AuthService.getUserByEmail.mockResolvedValue(
      unverified({ isEmailVerified: true })
    );

    const { next } = await call(AuthController.verifyEmail, {
      body: { email: "ada@example.com", code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.EMAIL_ALREADY_VERIFIED);
  });

  // < a code that does not match the stored OTP; nothing is saved
  test("rejects with 400 when the code is wrong", async () => {
    const user = unverified();
    AuthService.getUserByEmail.mockResolvedValue(user);

    const { next } = await call(AuthController.verifyEmail, {
      body: { email: user.email, code: 111111 },
    });

    expectError(next, 400, messagesEnum.INVALID_VERIFICATION_CODE);
    expect(user.save).not.toHaveBeenCalled();
  });

  // : the OTP expiry is in the past; the user stays unverified
  test("rejects with 400 when the code has expired", async () => {
    const user = unverified({
      emailVerificationTokenExpires: new Date(Date.now() - 1000),
    });
    AuthService.getUserByEmail.mockResolvedValue(user);

    const { next } = await call(AuthController.verifyEmail, {
      body: { email: user.email, code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_EXPIRED);
    expect(user.isEmailVerified).toBe(false);
  });
});

// # POST /auth/resend-otp/:userId
describe("AuthController.resendOtp", () => {
  // ? an old signup code is replaced with the test OTP and a fresh 10-minute expiry
  test("resets the signup OTP for an unverified user", async () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: 999999,
    });
    AuthService.getUserByUserId.mockResolvedValue(user);

    const { res, next, body } = await call(AuthController.resendOtp, {
      params: { userId: user.userId },
      body: { isSignupPasswordOtp: true },
    });

    expect(next).not.toHaveBeenCalled();
    expect(user.emailVerificationToken).toBe(TEST_OTP);
    expect(user.emailVerificationTokenExpires.getTime()).toBeGreaterThan(
      Date.now()
    );
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.user).not.toHaveProperty("password");
  });

  // ; an old reset code is replaced with the test OTP
  test("resets the forgot-password OTP for a verified user", async () => {
    const user = makeUser({ passwordToken: 999999 });
    AuthService.getUserByUserId.mockResolvedValue(user);

    const { next } = await call(AuthController.resendOtp, {
      params: { userId: user.userId },
      body: { isForgotPasswordOtp: true },
    });

    expect(next).not.toHaveBeenCalled();
    expect(user.passwordToken).toBe(TEST_OTP);
    expect(user.save).toHaveBeenCalled();
  });

  // * the body must set isSignupPasswordOtp or isForgotPasswordOtp
  test("rejects with 400 when neither OTP type is requested", async () => {
    const { next } = await call(AuthController.resendOtp, {
      params: { userId: "user-abc123" },
      body: {},
    });

    expectError(next, 400, messagesEnum.REQUEST_BODY_REQUIRED);
  });

  // & no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByUserId.mockResolvedValue(null);

    const { next } = await call(AuthController.resendOtp, {
      params: { userId: "user-missing" },
      body: { isSignupPasswordOtp: true },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ^  there is nothing to resend if the user has no pending code
  test("rejects with 404 when no OTP was ever issued", async () => {
    AuthService.getUserByUserId.mockResolvedValue(makeUser());

    const { next } = await call(AuthController.resendOtp, {
      params: { userId: "user-abc123" },
      body: { isForgotPasswordOtp: true },
    });

    expectError(next, 404, messagesEnum.VERIFICATION_CODE_NOT_FOUND);
  });

  // @ a verified user cannot request another signup code
  test("rejects a signup OTP for an already verified user", async () => {
    AuthService.getUserByUserId.mockResolvedValue(
      makeUser({ emailVerificationToken: TEST_OTP })
    );

    const { next } = await call(AuthController.resendOtp, {
      params: { userId: "user-abc123" },
      body: { isSignupPasswordOtp: true },
    });

    expectError(next, 400, messagesEnum.EMAIL_ALREADY_VERIFIED);
  });

  // ; password reset requires a verified email
  test("rejects a forgot-password OTP for an unverified user", async () => {
    AuthService.getUserByUserId.mockResolvedValue(
      makeUser({ isEmailVerified: false, emailVerificationToken: TEST_OTP })
    );

    const { next } = await call(AuthController.resendOtp, {
      params: { userId: "user-abc123" },
      body: { isForgotPasswordOtp: true },
    });

    expectError(next, 400, messagesEnum.EMAIL_NOT_VERIFIED);
  });
});

// # POST /auth/login
describe("AuthController.login", () => {
  // ? correct password for a verified user returns both tokens; password and OTP are stripped
  test("returns tokens and the user without secrets", async () => {
    const user = makeUser({ passwordToken: TEST_OTP });
    AuthService.getUserByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const { res, next, body } = await call(AuthController.login, {
      body: { email: user.email, password: "secret123" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith("secret123", user.password);
    expect(tokenService.generateJwtToken).toHaveBeenCalledWith(user);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.token).toBe("access-token");
    expect(body.refreshToken).toBe("refresh-token");
    expect(body.user).not.toHaveProperty("password");
    expect(body.user).not.toHaveProperty("passwordToken");
  });

  // ? the email fails format validation before any lookup
  test("rejects with 400 when the email is invalid", async () => {
    const { next } = await call(AuthController.login, {
      body: { email: "nope", password: "secret123" },
    });

    expectError(next, 400, messagesEnum.EMAIL_REQUIRED);
  });

  // ? no new password in the body
  test("rejects with 400 when the password is missing", async () => {
    const { next } = await call(AuthController.login, {
      body: { email: "ada@example.com" },
    });

    expectError(next, 400, messagesEnum.PASSWORD_REQUIRED);
  });

  // ? no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);

    const { next } = await call(AuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ? unverified users cannot log in, so no token is issued
  test("rejects with 400 when the email is not verified", async () => {
    AuthService.getUserByEmail.mockResolvedValue(
      makeUser({ isEmailVerified: false })
    );

    const { next } = await call(AuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expectError(next, 400, messagesEnum.EMAIL_NOT_VERIFIED);
    expect(tokenService.generateJwtToken).not.toHaveBeenCalled();
  });

  // ? bcrypt reports a mismatch, so no token is issued
  test("rejects with 401 when the password is wrong", async () => {
    AuthService.getUserByEmail.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(false);

    const { next } = await call(AuthController.login, {
      body: { email: "ada@example.com", password: "wrong" },
    });

    expectError(next, 401, messagesEnum.INVALID_PASSWORD);
    expect(tokenService.generateJwtToken).not.toHaveBeenCalled();
  });

  // = a successful login is written to the user's activity log
  test("tracks a successful login", async () => {
    AuthService.getUserByEmail.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(true);

    await call(AuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expect(UserActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-abc123",
        activity_type: "USRLGN",
        activity_status: "success",
      })
    );
  });

  // = a wrong password for a known user is logged as a failed login
  test("tracks a failed login for a known user", async () => {
    AuthService.getUserByEmail.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(false);

    await call(AuthController.login, {
      body: { email: "ada@example.com", password: "wrong" },
    });

    expect(UserActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-abc123",
        activity_type: "USRLGN",
        activity_status: "failed",
      })
    );
  });

  // = there is no user to attach the log to, so nothing is tracked
  test("does not track a login for an unknown email", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);

    await call(AuthController.login, {
      body: { email: "ada@example.com", password: "secret123" },
    });

    expect(UserActivityLog.create).not.toHaveBeenCalled();
  });
});

// # POST /auth/forgot-password
describe("AuthController.forgetPassword", () => {
  // ? a verified user gets the test OTP saved with an expiry; the response carries the userId and code
  test("stores the test OTP and returns it with the user id", async () => {
    const user = makeUser();
    AuthService.getUserByEmail.mockResolvedValue(user);

    const { res, next, body } = await call(AuthController.forgetPassword, {
      body: { email: user.email },
    });

    expect(next).not.toHaveBeenCalled();
    expect(user.passwordToken).toBe(TEST_OTP);
    expect(user.passwordTokenExpires.getTime()).toBeGreaterThan(Date.now());
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.data).toEqual(
      expect.objectContaining({ userId: user.userId, code: TEST_OTP })
    );
  });

  // ? the email fails format validation before any lookup
  test("rejects with 400 when the email is invalid", async () => {
    const { next } = await call(AuthController.forgetPassword, {
      body: { email: "nope" },
    });

    expectError(next, 400, messagesEnum.EMAIL_REQUIRED);
  });

  // ? no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByEmail.mockResolvedValue(null);

    const { next } = await call(AuthController.forgetPassword, {
      body: { email: "ada@example.com" },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ? unverified users cannot log in, so no token is issued
  test("rejects with 400 when the email is not verified", async () => {
    const user = makeUser({ isEmailVerified: false });
    AuthService.getUserByEmail.mockResolvedValue(user);

    const { next } = await call(AuthController.forgetPassword, {
      body: { email: user.email },
    });

    expectError(next, 400, messagesEnum.EMAIL_NOT_VERIFIED);
    expect(user.save).not.toHaveBeenCalled();
  });
});

// # POST /auth/verify-forget-password
describe("AuthController.verifyForgetPassword", () => {
  // & a verified user holding a valid, unexpired password-reset OTP
  const withOtp = overrides =>
    makeUser({
      passwordToken: TEST_OTP,
      passwordTokenExpires: new Date(Date.now() + TEN_MINUTES),
      ...overrides,
    });

  // ? the right code passes whether sent as a number or a string
  test("accepts the correct code, as a number or a string", async () => {
    for (const code of [TEST_OTP, String(TEST_OTP)]) {
      AuthService.getUserByUserId.mockResolvedValue(withOtp());

      const { res, next, body } = await call(
        AuthController.verifyForgetPassword,
        { body: { userId: "user-abc123", code } }
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(body.message).toBe(messagesEnum.VERIFICATION_SUCCESSFUL);
    }
  });

  // ? no userId in the body
  test("rejects with 400 when the user id is missing", async () => {
    const { next } = await call(AuthController.verifyForgetPassword, {
      body: { code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.USER_ID_REQUIRED);
  });

  // ? no code in the body
  test("rejects with 400 when the code is missing", async () => {
    const { next } = await call(AuthController.verifyForgetPassword, {
      body: { userId: "user-abc123" },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_REQUIRED);
  });

  // ? no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByUserId.mockResolvedValue(null);

    const { next } = await call(AuthController.verifyForgetPassword, {
      body: { userId: "user-missing", code: TEST_OTP },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ? a code that does not match the stored OTP; nothing is saved
  test("rejects with 400 when the code is wrong", async () => {
    AuthService.getUserByUserId.mockResolvedValue(withOtp());

    const { next } = await call(AuthController.verifyForgetPassword, {
      body: { userId: "user-abc123", code: 111111 },
    });

    expectError(next, 400, messagesEnum.INVALID_VERIFICATION_CODE);
  });

  // ? the OTP expiry is in the past; the user stays unverified
  test("rejects with 400 when the code has expired", async () => {
    AuthService.getUserByUserId.mockResolvedValue(
      withOtp({ passwordTokenExpires: new Date(Date.now() - 1000) })
    );

    const { next } = await call(AuthController.verifyForgetPassword, {
      body: { userId: "user-abc123", code: TEST_OTP },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_EXPIRED);
  });
});

// # POST /auth/reset-password
describe("AuthController.resetPassword", () => {
  // & a verified user holding a valid, unexpired password-reset OTP
  const withOtp = overrides =>
    makeUser({
      passwordToken: TEST_OTP,
      passwordTokenExpires: new Date(Date.now() + TEN_MINUTES),
      ...overrides,
    });

  // ? the new password is stored hashed and the reset OTP is cleared so it cannot be reused
  test("hashes the new password and clears the OTP", async () => {
    const user = withOtp();
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const { res, next, body } = await call(AuthController.resetPassword, {
      body: { userId: user.userId, password: "newpass1" },
    });

    expect(next).not.toHaveBeenCalled();
    expect(user.password).toBe("hashed:newpass1");
    expect(user.passwordToken).toBeNull();
    expect(user.passwordTokenExpires).toBeNull();
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(messagesEnum.PASSWORD_RESET_SUCCESSFUL);
    expect(body.user).not.toHaveProperty("password");
  });

  // ? no userId in the body
  test("rejects with 400 when the user id is missing", async () => {
    const { next } = await call(AuthController.resetPassword, {
      body: { password: "newpass1" },
    });

    expectError(next, 400, messagesEnum.USER_ID_REQUIRED);
  });

  // ? no new password in the body
  test("rejects with 400 when the password is missing", async () => {
    const { next } = await call(AuthController.resetPassword, {
      body: { userId: "user-abc123" },
    });

    expectError(next, 400, messagesEnum.PASSWORD_REQUIRED);
  });

  // ? no user matches the email or id
  test("rejects with 404 when the user does not exist", async () => {
    AuthService.getUserByUserId.mockResolvedValue(null);

    const { next } = await call(AuthController.resetPassword, {
      body: { userId: "user-missing", password: "newpass1" },
    });

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ? bcrypt reports the new password equals the current hash; nothing is saved
  test("rejects with 400 when the new password matches the old one", async () => {
    const user = withOtp();
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const { next } = await call(AuthController.resetPassword, {
      body: { userId: user.userId, password: "secret123" },
    });

    expectError(next, 400);
    expect(user.save).not.toHaveBeenCalled();
  });

  // ? the user has no reset OTP, so forgot-password was never started
  test("rejects with 404 when no reset was requested", async () => {
    const user = makeUser();
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const { next } = await call(AuthController.resetPassword, {
      body: { userId: user.userId, password: "newpass1" },
    });

    expectError(next, 404, messagesEnum.VERIFICATION_CODE_NOT_FOUND);
    expect(user.save).not.toHaveBeenCalled();
  });

  // ? the reset OTP expiry is in the past; the password is unchanged
  test("rejects with 400 when the OTP has expired", async () => {
    const user = withOtp({
      passwordTokenExpires: new Date(Date.now() - 1000),
    });
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const { next } = await call(AuthController.resetPassword, {
      body: { userId: user.userId, password: "newpass1" },
    });

    expectError(next, 400, messagesEnum.VERIFICATION_CODE_EXPIRED);
    expect(user.save).not.toHaveBeenCalled();
  });
});

// # PUT /auth/change-password/:userId
describe("AuthController.changePassword", () => {
  // & request from the logged-in user-abc123; userId is the route param
  const request = (body, userId = "user-abc123") => ({
    body,
    params: { userId },
    userId: "user-abc123",
  });

  // ? the logged-in user changes their own password; it is stored hashed
  test("hashes and saves the new password", async () => {
    const user = makeUser();
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    const { res, next, body } = await call(
      AuthController.changePassword,
      request({ password: "secret123", newPassword: "newpass1" })
    );

    expect(next).not.toHaveBeenCalled();
    expect(AuthService.getUserByUserId).toHaveBeenCalledWith("user-abc123");
    expect(user.password).toBe("hashed:newpass1");
    expect(user.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.success).toBe(true);
  });

  // ? the route param may be the Mongo _id instead of userId
  test("also accepts the Mongo _id in the route param", async () => {
    AuthService.getUserByUserId.mockResolvedValue(makeUser());
    bcrypt.compare.mockResolvedValue(false);

    const { next } = await call(
      AuthController.changePassword,
      request({ password: "secret123", newPassword: "newpass1" }, "mongo-id-1")
    );

    expect(next).not.toHaveBeenCalled();
  });

  // ? no current password in the body
  test("rejects with 400 when the current password is missing", async () => {
    const { next } = await call(
      AuthController.changePassword,
      request({ newPassword: "newpass1" })
    );

    expectError(next, 400, messagesEnum.PASSWORD_REQUIRED);
  });

  // ? no new password in the body
  test("rejects with 400 when the new password is missing", async () => {
    const { next } = await call(
      AuthController.changePassword,
      request({ password: "secret123" })
    );

    expectError(next, 400, messagesEnum.NEW_PASSWORD_REQUIRED);
  });

  // ? the token is valid but the account has been deleted
  test("rejects with 404 when the logged-in user no longer exists", async () => {
    AuthService.getUserByUserId.mockResolvedValue(null);

    const { next } = await call(
      AuthController.changePassword,
      request({ password: "secret123", newPassword: "newpass1" })
    );

    expectError(next, 404, messagesEnum.USER_NOT_FOUND);
  });

  // ? the route param belongs to a different user; nothing is saved
  test("rejects with 403 when changing someone else's password", async () => {
    const user = makeUser();
    AuthService.getUserByUserId.mockResolvedValue(user);

    const { next } = await call(
      AuthController.changePassword,
      request({ password: "secret123", newPassword: "newpass1" }, "user-other")
    );

    expectError(next, 403, messagesEnum.FORBIDDEN);
    expect(user.save).not.toHaveBeenCalled();
  });

  // ? bcrypt reports the new password equals the current hash; nothing is saved
  test("rejects with 400 when the new password matches the old one", async () => {
    const user = makeUser();
    AuthService.getUserByUserId.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const { next } = await call(
      AuthController.changePassword,
      request({ password: "secret123", newPassword: "secret123" })
    );

    expectError(next, 400, messagesEnum.NEW_PASSWORD_SAME_AS_OLD);
    expect(user.save).not.toHaveBeenCalled();
  });

  // Known bug: the current password is never checked, so anyone holding a
  // valid token can change the password without knowing the old one
  test.failing(
    "rejects with 401 when the current password is wrong",
    async () => {
      const user = makeUser();
      AuthService.getUserByUserId.mockResolvedValue(user);
      bcrypt.compare.mockImplementation(
        async (plain, hash) => hash === `hashed:${plain}`
      );

      const { next } = await call(
        AuthController.changePassword,
        request({ password: "not-my-password", newPassword: "newpass1" })
      );

      expectError(next, 401);
      expect(user.save).not.toHaveBeenCalled();
    }
  );
});

// # POST /auth/logout
describe("AuthController.logout", () => {
  // ? logout clears the token cookie
  test("clears the token cookie and responds 200", async () => {
    const { res, next, body } = await call(AuthController.logout, {});

    expect(next).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("token");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(messagesEnum.LOGOUT_SUCCESSFUL);
  });
});
