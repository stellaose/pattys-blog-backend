/* eslint-disable no-undef */
const Joi = require("joi");

module.exports = {
  resourceParams: Joi.object().keys({
    resourceId: Joi.string().required().messages({
      "any.required": "Resource ID is required",
      "string.empty": "Resource ID is required",
    }),
  }),
  createResource: Joi.object().keys({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500).allow("").optional(),
  }),
  editResource: Joi.object()
    .keys({
      name: Joi.string().trim().max(100).optional(),
      description: Joi.string().trim().max(500).allow("").optional(),
    })
    .min(1),
};
