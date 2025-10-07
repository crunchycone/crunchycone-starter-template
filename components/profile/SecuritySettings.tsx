"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Key, Loader2, AlertCircle } from "lucide-react";
import { generatePasswordResetTokenAction } from "@/app/actions/change-password";

interface SecuritySettingsProps {
  hasEmailPassword: boolean;
}

export function SecuritySettings({ hasEmailPassword }: SecuritySettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await generatePasswordResetTokenAction();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate reset link");
      }

      // Redirect to the reset password page with the token
      router.push(result.resetUrl!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate password change");
      setIsLoading(false);
    }
  };

  // Only show this card if user has email/password authentication
  if (!hasEmailPassword) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">Password</div>
              <div className="text-sm text-muted-foreground">Change your account password</div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleChangePassword}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
