"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthRedirectHandler() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only redirect if user is authenticated and no specific callback URL
    if (status === "authenticated" && session?.user) {
      const callbackUrl = searchParams?.get('callbackUrl');
      
      console.log('AuthRedirectHandler: User is authenticated', { 
        email: session.user.email,
        callbackUrl 
      });
      
      // If no specific callback URL or callback is signin page, redirect to home
      if (!callbackUrl || callbackUrl.includes('/auth/signin')) {
        console.log('AuthRedirectHandler: Redirecting to home');
        router.replace('/');
      } else {
        console.log('AuthRedirectHandler: Redirecting to callback URL', callbackUrl);
        router.replace(callbackUrl);
      }
    }
  }, [status, session, router, searchParams]);

  // Don't render anything visible
  return null;
}