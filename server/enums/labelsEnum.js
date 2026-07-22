import dayjs from "dayjs";

export const labelEnum = {
  CURRENT_TIME_STAMP: `${dayjs().format("DD-MMM-YYYY, HH:mm:ss")}`,
  USER_SIGNUP: "AuthController::signup",
  USER_VERIFICATION: "AuthController::verifyEmail",
  USER_FORGET_PASSWORD: "AuthController::forgetPassword",
  USER_RESET_PASSWORD: "AuthController::resetPassword",

  RESEND_OTP: "AuthController::resendOtp",
  USER_LOGIN: "AuthController::login",
  USER_SIGNUP: "AuthController::signup",
};
