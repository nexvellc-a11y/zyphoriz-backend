const nodemailer = require("nodemailer");
const ApiError = require("./ApiError");

const sendOtpEmail = async (email, otp) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    throw new ApiError(500, "Email service is not configured");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure:
      process.env.SMTP_SECURE === "true" ||
      Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: "Your Password Reset OTP",
    text: `Your password reset OTP is ${otp}.

This OTP expires in 5 minutes.

If you did not request a password reset, please ignore this email.`,
  });
};

module.exports = sendOtpEmail;