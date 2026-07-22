export const messagesEnum = {
  // $ General
  FORBIDDEN: "Forbidden",
  USER_ID_REQUIRED: "User ID is required",
  // ! Authentication related messages
  EMAIL_REQUIRED: "Email is required",
  EMAIL_EXISTS: "Email already exists",
  EMAIL_NOT_VERIFIED: "Email not verified",
  EMAIL_ALREADY_VERIFIED: "This e-mail has already been verified.",
  EMAIL_VERIFIED_SUCCESSFULLY: "Email verified successfully",
  EMAIL_SENT_SUCCESSFULLY: "Email sent successfully",
  INVALID_EMAIL: "Invalid email",

  // + Password
  PASSWORD_REQUIRED: "Password is required (min 8 chars)",
  INVALID_PASSWORD: "Invalid password",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_MISMATCH: "Passwords do not match",
  PASSWORD_RESET_SUCCESSFUL: "Password reset successful",
  NEW_PASSWORD_REQUIRED: "New password is required",
  PASSWORD_CANNOT_BE_SAME: "New password cannot be same as old password",
  PASSWORD_CHANGED_SUCCESSFUL: "Password changed successfully",

  // = Username
  USERNAME_REQUIRED: "Username is required",
  USERNAME_EXISTS: "Username already exists",
  INVALID_USERNAME: "Invalid username",

  // > Phone Number
  PHONE_NUMBER_REQUIRED: "Phone Number is required",
  INVALID_PHONE_NUMBER: "Invalid phone number",

  // ? Verification
  VERIFICATION_CODE_REQUIRED: "Verification code is required",
  INVALID_VERIFICATION_CODE: "Invalid verification code",
  VERIFICATION_CODE_EXPIRED: "Verification code has expired",
  INVALID_TOKEN: "Invalid token",
  VERIFICATION_SUCCESSFUL: "Verification successful",
  VERIFICATION_CODE_NOT_FOUND: "Verification code not found",

  // < User
  INVALID_USER: "Invalid user",
  USER_NOT_FOUND: "User not found",
  USER_NOT_VERIFIED: "User not verified",
  USER_VERIFIED_SUCCESSFULLY: "User verified successfully",
  USER_VERIFICATION_FAILED: "User verification failed",
  USER_FOUND: "User found successfully",
  USER_UPDATED_SUCCESSFULLY: "User updated successfully",

  // ' Sign up
  SIGNUP_SUCCESSFUL:
    "Thank you for signing up! Please check your email to verify your account.",

  // ; Resend OTP
  RESEND_OTP_SUCCESSFUL:
    "Check your email for a 6-digit code to verify your account.",

  // ; Forget Password
  FORGET_PASSWORD_SUCCESSFUL:
    "Check your email for a 6-digit code to reset your password.",

  // ? Login
};
