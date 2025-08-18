"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, CheckCircle, AlertCircle, Loader2, Unlink } from "lucide-react";
import { isGoogleAuthEnabled } from "@/lib/auth/providers";
import { disconnectOAuthAccountAction } from "@/app/actions/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Google Logo SVG Component (reused from SignInForm)
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

interface AccountLinkingProps {
  user: {
    accounts: Array<{
      provider: string;
      type: string;
    }>;
  };
  hasOAuthAccounts: boolean;
  hasEmailPassword: boolean;
}

export function AccountLinking({ user, hasOAuthAccounts, hasEmailPassword }: AccountLinkingProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if Google is connected
  const hasGoogleAccount = user.accounts.some(account => account.provider === 'google');
  const googleEnabled = isGoogleAuthEnabled();
  
  // Check if user can disconnect OAuth (has email/password OR multiple OAuth providers)
  const canDisconnectOAuth = hasEmailPassword || user.accounts.length > 1;

  const handleLinkGoogle = async () => {
    try {
      setIsLinking(true);
      setLinkingError(null);
      setSuccessMessage(null);

      // Use signIn to link the account
      const result = await signIn('google', {
        callbackUrl: '/profile?linked=google'
      });

      if (result?.error) {
        throw new Error('Failed to link Google account');
      }
    } catch (error) {
      setLinkingError(error instanceof Error ? error.message : 'Failed to link account');
      setIsLinking(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setIsDisconnecting('google');
      setDisconnectError(null);
      setSuccessMessage(null);

      const result = await disconnectOAuthAccountAction('google');
      
      if (result.success) {
        setSuccessMessage(result.message);
      }
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : 'Failed to disconnect account');
    } finally {
      setIsDisconnecting(null);
    }
  };

  // If user only has OAuth accounts (no email/password), don't show linking section
  if (hasOAuthAccounts && user.accounts.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Your account is connected via OAuth provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.accounts.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {account.provider === 'google' && (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  <div>
                    <div className="font-medium capitalize">{account.provider}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Connected
                  </Badge>
                  {/* Show disconnect button if user has alternative auth method */}
                  {canDisconnectOAuth && account.provider === 'google' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnectGoogle}
                            disabled={isDisconnecting === 'google'}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {isDisconnecting === 'google' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Disconnect</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show account linking options for email/password users
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Account Linking
        </CardTitle>
        <CardDescription>
          Connect your social accounts for easier sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkingError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{linkingError}</AlertDescription>
          </Alert>
        )}

        {disconnectError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{disconnectError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {/* Google Account Linking */}
          {googleEnabled && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <GoogleIcon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Google</div>
                  <div className="text-sm text-muted-foreground">
                    {hasGoogleAccount ? 'Connected' : 'Link your Google account'}
                  </div>
                </div>
              </div>
              
              {hasGoogleAccount ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Connected
                  </Badge>
                  {/* Show disconnect if user has alternative auth */}
                  {canDisconnectOAuth && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnectGoogle}
                            disabled={isDisconnecting === 'google'}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            {isDisconnecting === 'google' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Disconnect</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLinkGoogle}
                  disabled={isLinking}
                  className="min-w-[80px]"
                >
                  {isLinking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Link'
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Future providers can be added here */}
          {!googleEnabled && (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No OAuth providers are currently enabled</p>
            </div>
          )}
        </div>

        {hasGoogleAccount && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You can now sign in using your Google account or email/password.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}