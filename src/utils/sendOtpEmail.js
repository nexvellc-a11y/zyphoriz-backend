// const nodemailer = require("nodemailer");
// const ApiError = require("./ApiError");

// const sendOtpEmail = async (email, otp) => {
//   const {
//     SMTP_HOST,
//     SMTP_PORT,
//     SMTP_USER,
//     SMTP_PASS,
//     MAIL_FROM,
//   } = process.env;

//   if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
//     throw new ApiError(500, "Email service is not configured");
//   }

//   const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: Number(SMTP_PORT || 587),
//     secure:
//       process.env.SMTP_SECURE === "true" ||
//       Number(SMTP_PORT) === 465,
//     connectionTimeout: 10_000,
//     greetingTimeout: 10_000,
//     socketTimeout: 30_000,
//     auth: {
//       user: SMTP_USER,
//       pass: SMTP_PASS,
//     },
//   });

//   await transporter.sendMail({
//     from: MAIL_FROM,
//     to: email,
//     subject: "Your Password Reset OTP",
//     text: `Your password reset OTP is ${otp}.

// This OTP expires in 5 minutes.

// If you did not request a password reset, please ignore this email.`,
//   });
// };

// module.exports = sendOtpEmail;



const sendOtpEmail = async (email, otp) => {
  const {
    BREVO_API_KEY,
    MAIL_FROM_EMAIL,
    MAIL_FROM_NAME,
  } = process.env;

  if (!BREVO_API_KEY || !MAIL_FROM_EMAIL) {
    throw new Error("Brevo email configuration is missing");
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: MAIL_FROM_NAME || "Zyphoriz",
          email: MAIL_FROM_EMAIL,
        },
        to: [{ email }],
        subject: "Your Password Reset OTP",
        textContent:
          `Your password reset OTP is ${otp}.\n\n` +
          "This OTP expires in 5 minutes.\n\n" +
          "If you did not request this, please ignore this email.",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("Brevo email API error:", response.status, errorText);

    throw new Error("Unable to send OTP email");
  }

  return response.json();
};

module.exports = sendOtpEmail;