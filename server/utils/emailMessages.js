import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emailTemplatesDir = path.join(__dirname, "../templates/email");

const signupHtmlTemplate = fs.readFileSync(
  path.join(emailTemplatesDir, "signup.html"),
  "utf8"
);
const signupStylesheet = fs.readFileSync(
  path.join(emailTemplatesDir, "signup.css"),
  "utf8"
);
const signupStyleBlock = `<style>\n${signupStylesheet}\n</style>`;

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const signUpMail = (first_name, url) => ({
  subject: "Welcome to Pattys",
  text: `Welcome to Pattys`,
  html: signupHtmlTemplate
    .replace("{{EMAIL_STYLES}}", signupStyleBlock)
    .replaceAll("{{first_name}}", escapeHtml(first_name))
    .replaceAll("{{url}}", escapeHtml(url)),
});
