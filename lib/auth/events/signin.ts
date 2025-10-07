import { assignDefaultUserRole } from "@/lib/auth/utils/role-management";
import { sendWelcomeEmail } from "@/lib/email/auth-email-wrapper";
import type { User, Account } from "next-auth";

export async function signInEvent({
  user,
  account,
  isNewUser,
}: {
  user: User;
  account: Account | null;
  profile?: unknown;
  isNewUser?: boolean;
}) {
  console.log(`User signed in: ${user.email}, isNewUser: ${isNewUser}`);

  // Assign default role to new OAuth users and send welcome email
  if (isNewUser && (account?.provider === "google" || account?.provider === "github")) {
    try {
      const roleAssigned = await assignDefaultUserRole(user.id);
      if (roleAssigned) {
        console.log(`Assigned user role to new ${account.provider} user: ${user.email}`);
      }
    } catch (error) {
      console.error("Error assigning role to new user:", error);
    }

    // Send welcome email to new OAuth users (non-blocking)
    sendWelcomeEmail(user.email || "", user.name || undefined)
      .then(() => {
        console.log(`✅ Welcome email sent to new ${account.provider} user: ${user.email}`);
      })
      .catch((error) => {
        console.error("Failed to send welcome email to new OAuth user:", error);
        // Don't fail the signin if email fails
      });
  }
}
