import { findUserByEmail } from "@/lib/auth/utils/user-lookup";
import { assignDefaultUserRole } from "@/lib/auth/utils/role-management";
import { syncOAuthProfile } from "@/lib/auth/utils/profile-sync";
import type { User, Account, Profile } from "next-auth";

export async function signInCallback({
  user,
  account,
  profile,
}: {
  user: User;
  account: Account | null;
  profile?: Profile;
}) {
  // Handle email provider (magic links)
  // We don't block here - security is handled by not sending emails to non-existent users
  // in the sendVerificationRequest function in lib/auth/providers/email.ts
  if (account?.provider === "email") {
    console.log(`✅ Magic link sign-in flow for: ${user.email}`);
    return true;
  }

  // Handle OAuth account linking and role assignment
  if (account?.provider === "google" || account?.provider === "github") {
    console.log(`${account.provider} sign-in attempt for: ${user.email}`);

    // Check if email is available
    if (!user.email) {
      console.error(`${account.provider} user has no email address available`);

      // For GitHub users with private emails, we could use their GitHub username + provider
      // But for this demo, we'll require email access
      if (account.provider === "github") {
        console.log("GitHub user needs to make email public for this app");
      }
      return false;
    }

    try {
      // Check if user exists in our database
      const dbUser = await findUserByEmail(user.email);

      if (dbUser) {
        console.log(
          `Existing user found: ${user.email}, roles:`,
          dbUser.roles.map((r) => r.role.name)
        );

        // Check if user has any roles, if not assign default "user" role
        if (dbUser.roles.length === 0) {
          const roleAssigned = await assignDefaultUserRole(dbUser.id);
          if (roleAssigned) {
            console.log(`Assigned user role to: ${user.email}`);
          }
        }

        // Update user profile with OAuth provider data
        if (profile) {
          await syncOAuthProfile(dbUser.id, account.provider, profile);
        }
      } else {
        console.log(`New ${account.provider} user: ${user.email}`);
        // User will be created by Auth.js, but we need to assign role after creation
        // This will be handled in the events.signIn callback
      }
    } catch (error) {
      console.error("Error in signIn callback:", error);
    }
  }

  return true;
}
