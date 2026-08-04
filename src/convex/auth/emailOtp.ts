import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    try {
      await axios.post(
        "https://auth.freebuff.app/send_otp",
        {
          to: email,
          otp: token,
          appName: process.env.VLY_APP_NAME || "a freebuff.com application",
        },
        {
          headers: {
            "x-api-key": "fb_email_2crN1hqIArZP2bEfvjp5Qik4",
          },
        },
      );
    } catch (error) {
      // Unwrap axios errors so a 4xx (e.g. 400 from a stale API key) surfaces
      // as a readable message instead of a JSON blob the user can't parse.
      const axiosErr = error as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
      };
      const detail = axiosErr.response?.data?.error;
      const status = axiosErr.response?.status;
      const message =
        detail ||
        (status ? `Email service error (${status}).` : "") ||
        axiosErr.message ||
        "Failed to send the verification code.";
      throw new Error(message);
    }
  },
});
