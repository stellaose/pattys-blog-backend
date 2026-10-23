import { createRequire } from "module";
const require = createRequire(import.meta.url);

const adminValidation = require("./cjs/admin.utils.validation.cjs");

export default adminValidation;

export const { resourceParams, createResource, editResource } = adminValidation;
