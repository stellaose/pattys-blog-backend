export const statusEnum = {
  statusCode: {
    HTTP_BAD_GATEWAY: 502,
    HTTP_BAD_REQUEST: 400,
    HTTP_CREATED: 201,
    HTTP_FORBIDDEN: 403,
    HTTP_INTERNAL_SERVER_ERROR: 500,
    HTTP_NOT_FOUND: 404,
    HTTP_OK: 200,
    HTTP_UNAUTHORIZED: 401,
    HTTP_UNPROCESSABLE_ENTITY: 422,
    HTTP_TO_MANY_REQUESTS: 429,
    HTTP_CONFLICT: 409,
    HTTP_GONE: 410,
    SMTP_TRANSACTION_FAILED: 554,
    HTTP_SERVICE_UNAVAILABLE: 503,
  },
  eUserType: {
    Admin: "admin",
    SuperAdmin: "superAdmin",
    User: "user",
  },
};
