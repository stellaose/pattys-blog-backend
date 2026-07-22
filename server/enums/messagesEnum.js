export const messagesEnum = {
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

  // = Username
  USERNAME_REQUIRED: "Username is required",
  USERNAME_EXISTS: "Username already exists",
  INVALID_USERNAME: "Invalid username",
  
  // > Phone Number
  PHONE_NUMBER_REQUIRED: "Phone Number is required",
  INVALID_PHONE_NUMBER: "Invalid phone number",
  
  // ? Verification
  VERIFICATION_CODE_REQUIRED: "Verification code is required",
  INVALID_VERIFICATION_CODE: "Invalid or expired verification code",
  INVALID_TOKEN: "Invalid token",
  VERIFICATION_SUCCESSFUL: "Verification successful",
  
  // < User
  INVALID_USER: "Invalid user",
  USER_NOT_FOUND: "User not found",
  USER_NOT_VERIFIED: "User not verified",
  USER_VERIFIED_SUCCESSFULLY: "User verified successfully",
  USER_VERIFICATION_FAILED: "User verification failed",

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
