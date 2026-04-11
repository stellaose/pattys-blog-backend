import nodemailer from "nodemailer";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

function getRedirectUri() {
  return (
    process.env.REDIRECT_URI ||
    process.env.REDIRECT_URL ||
    "https://developers.google.com/oauthplayground"
  );
}

function getOAuth2Client() {
  const refreshToken = process.env.OAUTH_REFRESH_TOKEN?.trim();
  if (!refreshToken) {
    throw new Error(
      "Missing OAUTH_REFRESH_TOKEN. Set it in .env (Gmail OAuth refresh token from OAuth Playground or your app)."
    );
  }

  const client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    getRedirectUri()
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function sendEmail({ to, subject, html, text }) {
  const oAuth2Client = getOAuth2Client();
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
      refreshToken: process.env.OAUTH_REFRESH_TOKEN?.trim(),
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
  });
}
