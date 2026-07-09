import transporter from "../config/mailer.js";

/**
 * Generic email sender used by all controllers (OTP emails, notice
 * notifications, welcome emails, etc). Keeping this as a single utility
 * means SMTP provider changes only happen in one place.
 *
 * @param {Object} options
 * @param {string} options.to - recipient email address
 * @param {string} options.subject - email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - plain-text fallback body
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Pre-built HTML template for the Forgot Password OTP email.
 * Kept simple and inline-styled since many email clients strip <style> tags.
 */
export const otpEmailTemplate = (name, otp, expiryMinutes = 10) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
    <h2 style="color: #4f46e5; margin-bottom: 8px;">Password Reset Request</h2>
    <p style="color: #334155; font-size: 14px;">Hi ${name || "there"},</p>
    <p style="color: #334155; font-size: 14px;">
      We received a request to reset your Student Management System password.
      Use the OTP below to proceed. This code expires in ${expiryMinutes} minutes.
    </p>
    <div style="background: #eef2ff; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #4338ca;">${otp}</span>
    </div>
    <p style="color: #64748b; font-size: 12px;">
      If you did not request this, you can safely ignore this email — your password will remain unchanged.
    </p>
  </div>
`;
