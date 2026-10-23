/* eslint-disable no-undef */
import { AuthService } from "../service/user/auth.service.js";
import { Auth } from "../models/user/auth.model.js";

// ! mock auth schema so no database is needed
jest.mock("../models/user/auth.model.js", () => ({
  Auth: { findOne: jest.fn() },
}));

// $ reset calls and make every lookup find nothing
beforeEach(() => {
  jest.clearAllMocks();
  Auth.findOne.mockResolvedValue(null);
});

// # database queries behind the auth endpoints
describe("AuthService", () => {
  // ? emails are matched case-insensitively by lowercasing first
  test("getUserByEmail looks the user up by lowercased email", async () => {
    await AuthService.getUserByEmail("Ada@Example.com");

    expect(Auth.findOne).toHaveBeenCalledWith({ email: "ada@example.com" });
  });

  // ? userId is passed through unchanged
  test("getUserByUserId looks the user up by userId", async () => {
    await AuthService.getUserByUserId("user-abc123");

    expect(Auth.findOne).toHaveBeenCalledWith({ userId: "user-abc123" });
  });
});
