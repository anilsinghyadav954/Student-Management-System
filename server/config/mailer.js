import nodemailer from "nodemailer";

/**
 * Reusable Nodemailer transporter, configured from environment variables.
 * Works with Gmail SMTP (App Password) or any SMTP provider (SendGrid, Mailgun, etc.)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log("✅ Mail server is ready to send messages");
  } catch (error) {
    console.error(`⚠️  Mail server verification failed: ${error.message}`);
  }
};

export default transporter;
