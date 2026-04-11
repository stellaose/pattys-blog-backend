import nodemailer from "nodemailer";
import { google } from "googleapis";
import cors from "cors";

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);


oAuth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});


export async function sendEmail({ to, subject, html, text }) {
  const accessTokenResponse = await oAuth2Client.getAccessToken();
const accessToken =
  typeof accessTokenResponse === "string"
    ? accessTokenResponse
    : accessTokenResponse?.token;
  
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE,
    auth: {
      type: "OAuth2",
      user: process.env.SMTP_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
      accessToken: accessToken,
    },
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error("Missing SMTP_FROM (or SMTP_USER) env var");
  }

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}