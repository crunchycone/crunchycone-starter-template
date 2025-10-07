interface EmailOptions {
  appName: string;
  supportEmail: string;
}

function getEmailOptions(): EmailOptions {
  return {
    appName:
      process.env.NEXT_PUBLIC_APP_NAME ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
      "CrunchyCone Starter",
    supportEmail:
      process.env.CRUNCHYCONE_EMAIL_FROM || process.env.EMAIL_FROM || "noreply@crunchycone.app",
  };
}

/**
 * Helper function to send emails using local template rendering and email service.
 * This avoids the 401 authentication issues with sendTemplatedEmail when using CrunchyCone provider.
 */
async function sendEmailWithTemplate(
  templateName: string,
  recipientEmail: string,
  templateData: Record<string, unknown>,
  defaultSubject: string
): Promise<void> {
  try {
    // Import crunchycone-lib services
    const { createEmailService, getEmailTemplateService } = await import("crunchycone-lib");

    // Set email provider to console temporarily for template rendering
    const originalProvider = process.env.CRUNCHYCONE_EMAIL_PROVIDER;
    process.env.CRUNCHYCONE_EMAIL_PROVIDER = "console";

    try {
      // Render the template
      const templateService = getEmailTemplateService();
      const rendered = await templateService.previewTemplate(templateName, templateData, "en");

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
          email: process.env.CRUNCHYCONE_EMAIL_FROM || "noreply@crunchycone.app",
          name: process.env.CRUNCHYCONE_EMAIL_FROM_DISPLAY || "Your App",
        },
        to: [
          {
            email: recipientEmail,
            name: "User",
          },
        ],
        subject: rendered.subject || defaultSubject,
        htmlBody: rendered.html || "",
        textBody: rendered.text || "",
      });

      if (!result.success) {
        throw new Error(result.error || `Failed to send ${templateName} email`);
      }

      console.log(`✅ Email sent successfully (${templateName}) to: ${recipientEmail}`);
    } finally {
      // Ensure email provider is restored even if template rendering fails
      if (originalProvider === undefined) {
        delete process.env.CRUNCHYCONE_EMAIL_PROVIDER;
      } else {
        process.env.CRUNCHYCONE_EMAIL_PROVIDER = originalProvider;
      }
    }
  } catch (error) {
    console.error(`Failed to send ${templateName} email:`, error);
    throw new Error(`Failed to send ${templateName} email`);
  }
}

export async function sendMagicLinkEmail(email: string, signInUrl: string): Promise<void> {
  const options = getEmailOptions();
  await sendEmailWithTemplate(
    "magic-link",
    email,
    { signInUrl, ...options },
    "Sign in to your account"
  );
}

export async function sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  const options = getEmailOptions();
  await sendEmailWithTemplate(
    "email-verification",
    email,
    { verificationUrl, ...options },
    "Verify your email address"
  );
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const options = getEmailOptions();
  await sendEmailWithTemplate(
    "password-reset",
    email,
    { resetUrl, expiryHours: 1, ...options },
    "Reset your password"
  );
}

export async function sendAdminPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const options = getEmailOptions();
  await sendEmailWithTemplate(
    "admin-password-reset",
    email,
    { resetUrl, expiryHours: 1, ...options },
    "Password Reset Request"
  );
}

export async function sendWelcomeEmail(
  email: string,
  userName?: string,
  dashboardUrl?: string
): Promise<void> {
  const options = getEmailOptions();

  console.log(`📧 Sending welcome email to: ${email}`);
  console.log(`📧 Welcome email data:`, {
    userName,
    dashboardUrl:
      dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`,
    appName: options.appName,
    supportEmail: options.supportEmail,
  });

  await sendEmailWithTemplate(
    "welcome",
    email,
    {
      userName,
      dashboardUrl:
        dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`,
      ...options,
    },
    "Welcome!"
  );
}

// Auth.js compatible wrapper function
export async function sendAuthEmail(options: {
  identifier: string; // email
  url: string; // magic link URL
  provider: unknown; // Auth.js provider config
}) {
  await sendMagicLinkEmail(options.identifier, options.url);
}
