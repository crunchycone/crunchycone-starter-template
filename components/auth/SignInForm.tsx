"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { getOAuthProviders, hasOAuthProviders, hasMagicLinkProvider, isEmailPasswordEnabled } from "@/lib/auth/providers";

// Google Logo SVG Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const emailPasswordSchema = z.object({
  email: z.string().email({ error: "Invalid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

const magicLinkSchema = z.object({
  email: z.string().email({ error: "Invalid email address" }),
});

type EmailPasswordData = z.infer<typeof emailPasswordSchema>;
type MagicLinkData = z.infer<typeof magicLinkSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Get available providers
  const oauthProviders = getOAuthProviders();
  const showOAuthSection = hasOAuthProviders();
  const showMagicLinkTab = hasMagicLinkProvider();
  const showEmailPasswordForm = isEmailPasswordEnabled();

  // Handle URL error parameters
  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      switch (urlError) {
        case 'OAuthAccountNotLinked':
          setError('This email is already registered. Please sign in with your email and password first, then you can link your Google account in settings.');
          break;
        case 'OAuthSignin':
          setError('Error occurred during Google sign-in. Please try again.');
          break;
        case 'OAuthCallback':
          setError('Error occurred during authentication callback. Please try again.');
          break;
        case 'CredentialsSignin':
          setError('Invalid email or password.');
          break;
        default:
          setError('An authentication error occurred. Please try again.');
      }
    }
  }, [searchParams]);

  const emailPasswordForm = useForm<EmailPasswordData>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const magicLinkForm = useForm<MagicLinkData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onEmailPasswordSubmit(data: EmailPasswordData) {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      }

      if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function onMagicLinkSubmit(data: MagicLinkData) {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn("email", {
        email: data.email,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error || "Failed to send magic link");
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function onOAuthSignIn(providerId: string) {
    try {
      setIsOAuthLoading(true);
      setError(null);

      // For OAuth, we actually want to redirect to the provider
      // The redirect: false doesn't work properly for OAuth
      await signIn(providerId, {
        callbackUrl: "/"
      });
      
      // Note: This code won't run because signIn redirects to OAuth provider
      // The loading state will be cleared when the component unmounts or 
      // when the user returns from OAuth (handled by AuthRedirectHandler)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsOAuthLoading(false);
    }
  }

  if (magicLinkSent) {
    return (
      <div className="space-y-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            Check your email! We&apos;ve sent a magic link to sign in.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" onClick={() => setMagicLinkSent(false)}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* OAuth Loading Overlay */}
      {isOAuthLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground text-center">
              <p className="font-medium">Redirecting to authentication...</p>
              <p>This may take a few moments</p>
            </div>
          </div>
        </div>
      )}
      
      {/* OAuth Providers Section */}
      {showOAuthSection && (
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Sign in with
          </div>
          <div className="grid gap-2">
            {oauthProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                onClick={() => onOAuthSignIn(provider.id)}
                disabled={isOAuthLoading || isLoading}
                className="w-full"
              >
                {isOAuthLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : provider.id === 'google' ? (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                ) : provider.icon ? (
                  <span className="mr-2">{provider.icon}</span>
                ) : null}
                {isOAuthLoading ? "Connecting..." : provider.name}
              </Button>
            ))}
          </div>
          {/* Show separator only if email/password is also enabled */}
          {showEmailPasswordForm && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email/Password Form */}
      {showEmailPasswordForm && (
        <div className="space-y-4">
        <Form {...emailPasswordForm}>
          <form
            onSubmit={emailPasswordForm.handleSubmit(onEmailPasswordSubmit)}
            className="space-y-4"
          >
            <FormField
              control={emailPasswordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={emailPasswordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Lock className="mr-2 h-4 w-4" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </Form>
        </div>
      )}

      {/* Magic Link Section */}
      {showMagicLinkTab && (
        <div className="space-y-4">
          {/* Show separator only if there are other auth methods above */}
          {(showEmailPasswordForm || showOAuthSection) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or use magic link
                </span>
              </div>
            </div>
          )}
          <Form {...magicLinkForm}>
            <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
              <FormField
                control={magicLinkForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email for Magic Link</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" variant="outline" disabled={isLoading}>
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
