import bcrypt from "bcryptjs";
import Joi from "joi";
import { AdminAuth } from "../models/admin/admin-auth.model.js";
import { AdminRoles } from "../models/admin/admin-roles.model.js";
import { AdminAuthService } from "../service/admin/admin-auth.service.js";
import { statusEnum } from "../enums/index.js";
import { createId } from "../utils/helper.js";

const { adminStatus, adminRoleTypes, roleStatus } = statusEnum;

const superAdminDetails = {
  first_name: "Stella",
  last_name: "Oseyomon",
  email: "stella_admin@yopmail.com",
  password: "TestAdmin1234!",
  gender: "female",
  phone_number: "+23470122855590",
};

const superAdminSchema = Joi.object({
  first_name: Joi.string().trim().max(100).required(),
  last_name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/[a-z]/, "a lowercase letter")
    .pattern(/[A-Z]/, "an uppercase letter")
    .pattern(/\d/, "a number")
    .pattern(/[^A-Za-z0-9]/, "a symbol")
    .custom((password, helpers) =>
      password.toLowerCase() === helpers.state.ancestors[0].email?.toLowerCase()
        ? helpers.error("any.invalid")
        : password
    )
    .required()
    // ! custom messages so the password itself never ends up in an error or log
    .messages({
      "string.min": "password must be at least {#limit} characters",
      "string.pattern.name": "password must contain {#name}",
      "any.invalid": "password must not be the same as the email",
    }),
  gender: Joi.string().valid("male", "female").required(),
  phone_number: Joi.string()
    .trim()
    .pattern(/^\+?\d{10,15}$/, "a phone number")
    .optional(),
});

// > drops empty values so Joi reports them as missing
const readSeedValues = () =>
  Object.fromEntries(
    Object.entries(superAdminDetails)
      .map(([field, value]) => [field, value?.trim()])
      .filter(([, value]) => value)
  );

export const seedSuperAdmin = async () => {
  const values = readSeedValues();

  const { value: admin, error } = superAdminSchema.validate(values, {
    abortEarly: false,
  });

  if (error) {
    // ~ field names only, never the submitted values (the password is one)
    const problems = error.details.map(detail => detail.message).join("; ");
    throw new Error(`Invalid super admin seed values: ${problems}`);
  }

  if (await AdminAuthService.getAdminByEmail(admin.email)) {
    return { inserted: 0, skipped: `${admin.email} already exists` };
  }

  // $ emails stay unique across soft-deleted admins, so do not re-create one
  if (await AdminAuthService.getDeletedAdminByEmail(admin.email)) {
    return {
      inserted: 0,
      skipped: `${admin.email} belongs to a deleted admin; restore it instead`,
    };
  }

  // # the admin roles seeder must run first
  const role = await AdminRoles.findOne({ role: adminRoleTypes.SUPER_ADMIN });

  if (!role) {
    throw new Error(
      `Role "${adminRoleTypes.SUPER_ADMIN}" not found; seed the admin roles first`
    );
  }

  if (role.status !== roleStatus.ACTIVE) {
    throw new Error(`Role "${adminRoleTypes.SUPER_ADMIN}" is not active`);
  }

  // ' super admins have every permission, so no permission rows are created
  const created = await AdminAuth.create({
    adminId: createId("admin", 24),
    first_name: admin.first_name,
    last_name: admin.last_name,
    email: admin.email,
    phone_number: admin.phone_number,
    password: await bcrypt.hash(admin.password, 10),
    gender: admin.gender,
    role: role.role,
    roleId: role.roleId,
    status: adminStatus.ACTIVE,
    isEmailVerified: true,
    is_created_password: true,
  });

  return { inserted: 1, adminId: created.adminId, email: created.email };
};
