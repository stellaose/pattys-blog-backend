import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emailTemplatesDir = path.join(__dirname, "../templates/email"); 
const forgetPasswordEmailTemplatesDir = path.join(__dirname, "../templates/forgetPassword"); 

const signupHtmlTemplate = fs.readFileSync(
  path.join(emailTemplatesDir, "signup.html"),
  "utf8"
);
const signupStylesheet = fs.readFileSync(
  path.join(emailTemplatesDir, "signup.css"),
  "utf8"
);
const signupStyleBlock = `<style>\n${signupStylesheet}\n</style>`;

// # forget password
const forgetPasswordHtmlTemplate = fs.readFileSync(
  path.join(forgetPasswordEmailTemplatesDir, "index.html"),
  "utf8"
);
const forgetPasswordStylesheet = fs.readFileSync(
  path.join(  forgetPasswordEmailTemplatesDir, "style.css"),
  "utf8"
);

const forgetPasswordStyleBlock = `<style>\n${forgetPasswordStylesheet}\n</style>`;

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const signUpMail = (first_name, verificationCode) => ({
  subject: "Welcome to Pattys — verify your email",
  text: `Welcome to Pattys.`,
  html: signupHtmlTemplate
    .replace("{{EMAIL_STYLES}}", signupStyleBlock)
    .replaceAll("{{first_name}}", escapeHtml(first_name))
    .replaceAll("{{code}}", escapeHtml(verificationCode)),
});

export const forgetPasswordMail = (first_name, verificationCode) => ({
  subject: "Reset Password",
  text: `Reset Password`,
  html: forgetPasswordHtmlTemplate
    .replace("{{EMAIL_STYLES}}", forgetPasswordStyleBlock)
    .replaceAll("{{first_name}}", escapeHtml(first_name))
    .replaceAll("{{code}}", escapeHtml(verificationCode)),
});


