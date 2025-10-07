import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

async function sendMagicLinkEmail(email: string, url: string, provider: { from: string }) {
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

    // User exists, send the magic link email
    // Import crunchycone-lib services
    const { createEmailService, getEmailTemplateService } = await import("crunchycone-lib");

    // Set email provider to the configured provider temporarily for template rendering
    const originalProvider = process.env.CRUNCHYCONE_EMAIL_PROVIDER;
    process.env.CRUNCHYCONE_EMAIL_PROVIDER = "console";

    try {
      // Render the magic-link template
      const templateService = getEmailTemplateService();
      const templateData = {
        signInUrl: url,
        appName: process.env.NEXT_PUBLIC_APP_NAME || "Your App",
        supportEmail: process.env.CRUNCHYCONE_EMAIL_FROM || "support@example.com",
      };

      const rendered = await templateService.previewTemplate("magic-link", templateData, "en");

      // Restore original email provider
      if (originalProvider === undefined) {
        delete process.env.CRUNCHYCONE_EMAIL_PROVIDER;
      } else {
        process.env.CRUNCHYCONE_EMAIL_PROVIDER = originalProvider;
      }

      // Send the email using the actual email service
      const emailService = createEmailService();
      const result = await emailService.sendEmail({
        from: {
          email: provider.from,
          name: process.env.CRUNCHYCONE_EMAIL_FROM_DISPLAY || "Your App",
        },
        to: [
          {
            email: email,
            name: user.name || "User",
          },
        ],
        subject: rendered.subject || "Sign in to your account",
        htmlBody: rendered.html || "",
        textBody: rendered.text || "",
      });

      if (!result.success) {
        console.error("Failed to send magic link email:", result.error);
        throw new Error(result.error || "Failed to send magic link email");
      }

      console.log("✅ Magic link email sent successfully to:", email);
    } finally {
      // Ensure email provider is restored even if template rendering fails
      if (originalProvider === undefined) {
        delete process.env.CRUNCHYCONE_EMAIL_PROVIDER;
      } else {
        process.env.CRUNCHYCONE_EMAIL_PROVIDER = originalProvider;
      }
    }
  } catch (error) {
    console.error("Magic link email error:", error);

    // Fallback to console logging for development
    console.log(`
🔗 Magic Link Email (Fallback - Check Email Configuration)
=========================================================
To: ${email}
From: ${provider.from}

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
    // Custom email sending function using CrunchyCone email service and templates
    sendVerificationRequest: async ({ identifier: email, url, provider }) => {
      await sendMagicLinkEmail(email, url, provider);
    },
  });
}
