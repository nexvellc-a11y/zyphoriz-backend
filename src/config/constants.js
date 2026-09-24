module.exports = {
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_EXPIRES_DAYS: Number(process.env.COOKIE_EXPIRES_DAYS || 7),
  REFERRAL_COMMISSION: Number(process.env.REFERRAL_COMMISSION || 50),
  STANDARD_PLAN_PRICE: Number(process.env.STANDARD_PLAN_PRICE || 499),
  CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID,
  CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET,
  CASHFREE_ENV: process.env.CASHFREE_ENV || "SANDBOX",
  DEFAULT_OPENING_HOURS: [
    { day: "Monday", open: true, from: "09:00", to: "18:00" },
    { day: "Tuesday", open: true, from: "09:00", to: "18:00" },
    { day: "Wednesday", open: true, from: "09:00", to: "18:00" },
    { day: "Thursday", open: true, from: "09:00", to: "18:00" },
    { day: "Friday", open: true, from: "09:00", to: "18:00" },
    { day: "Saturday", open: true, from: "09:00", to: "18:00" },
    { day: "Sunday", open: false, from: "09:00", to: "18:00" },
  ],
};
