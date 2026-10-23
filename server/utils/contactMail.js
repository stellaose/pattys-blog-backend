import { escapeHtml } from "./escapeHtml.js";

export const contactUsMail = ({ name, email, topic, message }) => ({
  subject: `Pattys contact form: ${topic}`,
  text: `New message from ${name} <${email}>\n\nTopic: ${topic}\n\n${message}`,
  html: `
    <h2>New message from the Pattys contact form</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
    <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
    <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
  `,
});
