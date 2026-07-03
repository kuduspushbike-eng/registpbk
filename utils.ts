import { DEADLINE } from "./config";

export const sanitizePhoneNumber = (phone: string): string => {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("62")) {
    clean = "0" + clean.substring(2);
  } else if (!clean.startsWith("0")) {
    clean = "0" + clean;
  }
  return clean;
};

export const calculateTimeLeft = () => {
  const difference = +DEADLINE - +new Date();
  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }
  return null; // Expired
};
