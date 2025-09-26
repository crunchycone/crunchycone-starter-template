import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUserCredentials } from "@/lib/auth/utils/password-auth";

export function createCredentialsProvider() {
  // Only include if email/password is enabled (enabled by default)
  if (process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD === "false") {
    return null;
  }

  return CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      return await verifyUserCredentials(
        credentials.email as string,
        credentials.password as string
      );
    },
  });
}
