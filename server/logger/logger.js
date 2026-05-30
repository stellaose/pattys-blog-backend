import dotenv from "dotenv";
import winston from "winston";

dotenv.config({ quiet: true });

const { format, transports } = winston;
const logFileName =
  process.env.PATTYS_LOG_FILE || process.env.PATTYS_NODE_ENV || "app";
const logLevel = process.env.PATTYS_LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp(),
    format.printf(info => {
      const { timestamp, level, message } = info;
      const colors = { info: "\x1b[32m", warn: "\x1b[33m", error: "\x1b[31m" };
      const resetColor = "\x1b[0m";
      const colorizedMessage = colors[level]
        ? `${colors[level]}${message}${resetColor}`
        : message;

      return `${timestamp} [${level.toUpperCase()}]: ${colorizedMessage}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: `${logFileName}.log` }),
  ],
});

export default logger;
