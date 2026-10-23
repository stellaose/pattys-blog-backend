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
    userId: Joi.string().required().messages({
      "any.required": "User ID is required",
      "string.empty": "User ID is required",
    }),
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
    code: Joi.number().required(),
  }),
  resendOtpParams: Joi.object().keys({
    userId: Joi.string().required().messages({
      "any.required": "User ID is required",
      "string.empty": "User ID is required",
    }),
  }),
  resendOtp: Joi.object().keys({
    isSignupPasswordOtp: Joi.boolean().optional(),
    isForgotPasswordOtp: Joi.boolean().optional(),
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
    code: Joi.number().required(),
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
  createBlog: Joi.object().keys({
    title: Joi.string().required(),
    category: Joi.string().required(),
    description: Joi.array().min(1).items(Joi.string()).required(),
  }),
  editBlog: Joi.object().keys({
    title: Joi.string().optional(),
    category: Joi.string().optional(),
    description: Joi.array().min(1).items(Joi.string()).optional(),
  }),
  blogParams: Joi.object().keys({
    blogId: Joi.string().required().messages({
      "any.required": "Blog ID is required",
      "string.empty": "Blog ID is required",
    }),
  }),
  likeDislikeBlog: Joi.object().keys({
    likeStatus: Joi.string().valid("like", "dislike", "none").required(),
  }),
  createBlogReview: Joi.object().keys({
    review: Joi.string().required(),
  }),
  createContactMessage: Joi.object().keys({
    name: Joi.string().trim().max(100).required(),
    email: Joi.string().trim().email().required(),
    topic: Joi.string().trim().max(100).required(),
    message: Joi.string().trim().max(5000).required(),
  }),
  reviewParams: Joi.object().keys({
    reviewId: Joi.string().required().messages({
      "any.required": "Review ID is required",
      "string.empty": "Review ID is required",
    }),
  }),
};
