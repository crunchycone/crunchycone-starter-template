import { checkAdminExists } from "./actions/admin";
import { getCurrentUser } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Shield, ArrowRight, CheckCircle, User } from "lucide-react";

interface HomeProps {
  searchParams: Promise<{
    message?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const message = params.message;
  const [adminExists, currentUser] = await Promise.all([
    checkAdminExists(),
    getCurrentUser(),
  ]);

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
              Let's get started by setting up your administrator account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>First Time Setup Required</AlertTitle>
              <AlertDescription>
                No administrator account has been created yet. You'll need to set up an admin
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
    const isAdmin = currentUser.roles.some(r => r.role.name === "admin");
    
    return (
      <div className="min-h-screen bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <User className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome Back!</CardTitle>
            <CardDescription>
              You're signed in as {currentUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message === 'magic_link_success' && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">Success!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  You've been successfully signed in via magic link.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <h3 className="font-semibold">Your Account</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Email: {currentUser.email}</p>
                <p>Member since: {new Date(currentUser.created_at).toLocaleDateString()}</p>
                <p>Roles: {currentUser.roles.map(r => r.role.name).join(", ") || "user"}</p>
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
              <form action="/api/auth/logout" method="post">
                <Button type="submit" className="w-full" variant="outline">
                  Sign Out
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
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