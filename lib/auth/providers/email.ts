import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";
import { sendMagicLinkEmail } from "@/lib/email/auth-email-wrapper";

async function sendMagicLinkEmailToUser(email: string, url: string) {
  try {
    // Simply check if the email exists in the database
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        deleted_at: null,
      },
    });

    // If user doesn't exist, silently return without sending email
    // This prevents email enumeration attacks
    if (!user) {
      console.log(`🔒 Magic link requested for non-existent email: ${email}`);
      return; // Don't send email, but user sees success message
    }

    // User exists, send the magic link email using the wrapper
    console.log(`📧 Sending magic link email to: ${email}`);
    await sendMagicLinkEmail(email, url);
  } catch (error) {
    console.error("Magic link email error:", error);

    // Fallback to console logging for development
    console.log(`
🔗 Magic Link Email (Fallback - Check Email Configuration)
=========================================================
To: ${email}

Click the link below to sign in:
${url}

This link will expire in 24 hours.
    `);
  }
}

export function createEmailProvider() {
  const enableMagicLink = process.env.NEXT_PUBLIC_ENABLE_MAGIC_LINK;
  if (enableMagicLink !== "true" && enableMagicLink !== "1") {
    return null;
  }

  return EmailProvider({
    from: process.env.CRUNCHYCONE_EMAIL_FROM || process.env.EMAIL_FROM || "noreply@crunchycone.app",
    // Custom email sending function
    sendVerificationRequest: async ({ identifier: email, url }) => {
      await sendMagicLinkEmailToUser(email, url);
    },
  });
}
