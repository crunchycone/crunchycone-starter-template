import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, LogIn } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface ErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

// NextAuth error types and their user-friendly messages
const errorMessages: Record<string, { title: string; description: string }> = {
  MissingToken: {
    title: "Link is Missing Token",
    description: "Link is missing its token. Please try again.",
  },
  Configuration: {
    title: "Server Configuration Error",
    description:
      "There is a problem with the server configuration. Please contact support if this persists.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to sign in. Please contact an administrator.",
  },
  Verification: {
    title: "Verification Failed",
    description: "The link has expired or has already been used. Please request a new one.",
  },
  OAuthSignin: {
    title: "OAuth Sign-In Error",
    description: "An error occurred while trying to sign in with your provider. Please try again.",
  },
  OAuthCallback: {
    title: "OAuth Callback Error",
    description:
      "An error occurred during the OAuth callback. The authentication process was interrupted.",
  },
  OAuthCreateAccount: {
    title: "Account Creation Error",
    description:
      "Could not create an OAuth account. The email may already be associated with another account.",
  },
  EmailCreateAccount: {
    title: "Email Account Error",
    description: "Could not create an account with this email. It may already be in use.",
  },
  Callback: {
    title: "Callback Error",
    description: "An error occurred during the authentication callback. Please try again.",
  },
  OAuthAccountNotLinked: {
    title: "Account Not Linked",
    description:
      "This email is already associated with another account. Please sign in using your original authentication method.",
  },
  EmailSignin: {
    title: "Email Sign-In Error",
    description: "Failed to send the sign-in email. Please check your email address and try again.",
  },
  CredentialsSignin: {
    title: "Sign-In Failed",
    description: "Invalid email or password. Please check your credentials and try again.",
  },
  SessionRequired: {
    title: "Session Required",
    description: "You must be signed in to access this page. Please sign in to continue.",
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during authentication. Please try again.",
  },
};

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const error = params.error || "Default";

  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>Something went wrong during authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{errorInfo.title}</AlertTitle>
            <AlertDescription>{errorInfo.description}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Try Again
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && error && (
            <Alert className="mt-4">
              <AlertDescription className="text-xs font-mono">Error code: {error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
