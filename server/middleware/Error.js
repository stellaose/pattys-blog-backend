import ErrorResponse from "../utils/ErrorHandler.js";

const ErrorMiddleware = (err, req, res, next) => {
  // !Prevent sending response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // $ Log error in development
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    console.log(err);
  }

  let error = { ...err };
  error.message = err.message;

  // & Wrong Mongoose Object ID Error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    error = new ErrorResponse(message, 400);
  }

  // ? Handling Mongoose Validation Error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map(value => value.message);
    error = new ErrorResponse(message, 400);
  }

  // ` Handling Mongoose duplicate key errors
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    error = new ErrorResponse(message, 400);
  }

  // # Handling wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = "JSON Web Token is invalid. Try Again!!!";
    error = new ErrorResponse(message, 400);
  }

  //' Handling Expired JWT error
  if (err.name === "TokenExpiredError") {
    const message = "JSON Web Token is expired. Try Again!!!";
    error = new ErrorResponse(message, 400);
  }

  // ^ Send single response based on environment
  const responseData = {
    success: false,
    message: error.message,
  };

  res.status(error.statusCode || 500).json(responseData);
};

export default ErrorMiddleware;