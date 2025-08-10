import { checkAdminExists, isDatabaseEmpty } from "./actions/admin";
import { signOutAction } from "./actions/auth";
import { getCurrentUser } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Shield, ArrowRight, CheckCircle, User } from "lucide-react";

export const dynamic = "force-dynamic";

interface HomeProps {
  searchParams: Promise<{
    message?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const message = params.message;
  const [adminExists, currentUser, dbEmpty] = await Promise.all([
    checkAdminExists(),
    getCurrentUser(),
    isDatabaseEmpty(),
  ]);

  // Special case: Database is completely empty (fresh install/development)
  if (dbEmpty) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="h-12 w-12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {/* Waffle cone */}
                  <path
                    d="M7 11 L12 22 L17 11 Z"
                    fill="#D2691E"
                    stroke="#A0522D"
                    strokeWidth="0.5"
                  />
                  {/* Cone waffle pattern */}
                  <path
                    d="M8.5 13 L15.5 13 M9 15 L15 15 M9.5 17 L14.5 17 M10 19 L14 19 M10.5 21 L13.5 21"
                    stroke="#A0522D"
                    strokeWidth="0.3"
                    opacity="0.5"
                  />

                  {/* Bottom left scoop - Strawberry */}
                  <circle
                    cx="9.5"
                    cy="9"
                    r="2.5"
                    fill="#FFB6C1"
                    stroke="#FF69B4"
                    strokeWidth="0.5"
                  />

                  {/* Bottom right scoop - Vanilla */}
                  <circle
                    cx="14.5"
                    cy="9"
                    r="2.5"
                    fill="#FFFACD"
                    stroke="#F0E68C"
                    strokeWidth="0.5"
                  />

                  {/* Top scoop - Chocolate */}
                  <circle
                    cx="12"
                    cy="5"
                    r="2.5"
                    fill="#D2691E"
                    stroke="#8B4513"
                    strokeWidth="0.5"
                  />

                  {/* Highlights for depth */}
                  <ellipse cx="11" cy="4.5" rx="0.7" ry="0.5" fill="#E6A85C" opacity="0.6" />
                  <ellipse cx="8.5" cy="8.5" rx="0.7" ry="0.5" fill="#FFC0CB" opacity="0.7" />
                  <ellipse cx="13.5" cy="8.5" rx="0.7" ry="0.5" fill="#FFFFF0" opacity="0.7" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Welcome to CrunchyCone</CardTitle>
              <CardDescription>Your application is ready for development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Fresh Installation Detected</AlertTitle>
                <AlertDescription>
                  The database is empty. Let&apos;s start by setting up an administrator account to
                  manage your application.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">Get Started</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your administrator account to begin managing your application:
                </p>
              </div>

              <Link href="/auth/setup-admin">
                <Button className="w-full" size="lg" variant="default">
                  Set Up Admin Account
                  <Shield className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!adminExists) {
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to Your Application</CardTitle>
              <CardDescription>
                Let&apos;s get started by setting up your administrator account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>First Time Setup Required</AlertTitle>
                <AlertDescription>
                  No administrator account has been created yet. You&apos;ll need to set up an admin
                  account to manage your application.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Create your administrator email and password</li>
                  <li>Get full access to the admin dashboard</li>
                  <li>Start managing users and application settings</li>
                </ul>
              </div>

              <Link href="/auth/setup-admin" className="block">
                <Button className="w-full" size="lg">
                  Set Up Admin Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User is signed in
  if (currentUser) {
    const isAdmin = currentUser.roles.some((r) => r.role.name === "admin");

    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4">
            {isAdmin && (
              <>
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">Congratulations!</CardTitle>
                    <CardDescription className="text-base">
                      You have completed the first step in getting your application to work
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                      <AlertTitle className="text-blue-800 dark:text-blue-200">
                        Main Application Page
                      </AlertTitle>
                      <AlertDescription className="text-blue-700 dark:text-blue-300">
                        This is the main page of your application when you are logged in as an admin
                        user. This is also the screen signed in users will see. You can decide if
                        the main app page requires users to be signed in or not, and if so, how it
                        will look. You can change it to include any parts you want - dashboards,
                        navigation, features, or redirect to your admin panel automatically.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                <CardDescription>You&apos;re signed in as {currentUser.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message === "magic_link_success" && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      You&apos;ve been successfully signed in via magic link.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold">Your Account</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Email: {currentUser.email}</p>
                    <p>Member since: {new Date(currentUser.created_at).toLocaleDateString()}</p>
                    <p>Roles: {currentUser.roles.map((r) => r.role.name).join(", ") || "user"}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isAdmin && (
                    <Link href="/admin">
                      <Button className="w-full" variant="default">
                        Go to Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <form action={signOutAction}>
                    <Button type="submit" className="w-full" variant="outline">
                      Sign Out
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // No user signed in, but admin exists
  return (
    <div className="min-h-screen bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Your Application is Ready!</CardTitle>
            <CardDescription>
              The administrator account has been set up successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Sign in to access all features of your application.
            </p>

            <div className="flex flex-col gap-2">
              <Link href="/auth/signin">
                <Button className="w-full" variant="default">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline">
                  Create New Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
