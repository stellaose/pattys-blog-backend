import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import ErrorResponse from "../../utils/ErrorHandler.js";
import validateEmail from "../../utils/Validation.js";
import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import { AdminAuthService } from "../../service/admin/admin-auth.service.js";
import tokenService from "../../utils/token.js";
import logger from "../../logger/logger.js";
import { labelEnum, messagesEnum, statusEnum } from "../../enums/index.js";
import { createId } from "../../utils/helper.js";

dotenv.config({ quiet: true })

// + Email sending is disabled so others can test: every OTP is this fixed code.
const TEST_OTP = 654321;

export const AdminAuthController = {
  
}