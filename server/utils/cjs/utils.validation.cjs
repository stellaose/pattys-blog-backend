const Joi = require("joi").extend(require("@joi/date"));

module.exports = {
  processJoiValidation:
    (schema, type = "payload") =>
    async (req, res, next) => {
      const getType = {
        payload: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers,
        file: req.files,
      };
      const options = { language: { key: "{{key}} " } };
      const data = getType[type];
      const isValid = await schema.validate(data, options);
      if (!isValid.error) {
        return next();
      }
      const { message } = isValid.error.details[0];
      return res.status(422).json({
        code: 422,
        success: false,
        message: message.replace(/["]+/gi, ""),
      });
    },
  paginatedSearchStatusDateFilterExport: Joi.object().keys({
    page: Joi.number().positive().optional(),
    per_page: Joi.number().positive().optional(),
    search: Joi.string().optional(),
    status: Joi.string().optional(),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
  }),
 userIdParams: Joi.object().keys({
    userId: Joi.string().required(),
 }),
 signup: Joi.object().keys({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    user_name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone_number: Joi.string().optional(),
    gender: Joi.string().optional(),
    bio: Joi.string().optional(),
 }),
 verifyEmail: Joi.object().keys({
    email: Joi.string().email().required(),
    code: Joi.string().required(),
 }),
 resendOtpParams: Joi.object().keys({
    userId: Joi.string().required(),
 }),
 resendOtp: Joi.object().keys({
   isSignupPasswordOtp: Joi.boolean().required(),
 }),
 login: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
 }),
 forgetPassword: Joi.object().keys({
    email: Joi.string().email().required(),
 }),
 verifyForgetPassword: Joi.object().keys({
    userId: Joi.string().required(),
    code: Joi.string().required(),
 }),
 resetPassword: Joi.object().keys({
    userId: Joi.string().required(),
    password: Joi.string().min(6).required(),
 }),
 changePasswordParams: Joi.object().keys({
    userId: Joi.string().required(),
 }),
 changePassword: Joi.object().keys({
    password: Joi.string().min(6).required(),
    newPassword: Joi.string().min(6).required(),
 }),
 updateProfile: Joi.object().keys({
    userId: Joi.string().required(),
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    user_name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone_number: Joi.string().optional(),
    gender: Joi.string().optional(),
    bio: Joi.string().optional(),
 }),
};
