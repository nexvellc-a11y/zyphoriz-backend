// Mirrors the frontend's referralCodeFor(): NEX-<first 4 alnum of email>-<last 4 digits of mobile>
const generateReferralCode = (email, mobile) => {
  const emailPart = (email || '').replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
  const mobilePart = (mobile || '').replace(/\D/g, '').slice(-4);
  return `${emailPart}${mobilePart}`;
};

module.exports = generateReferralCode;
