import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Force dynamic rendering for Docker builds
export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage application settings and configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Configure general application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Application Name</h3>
            <p className="text-sm text-muted-foreground">CrunchyCone Starter Template</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium">Environment</h3>
            <p className="text-sm text-muted-foreground">{process.env.NODE_ENV || "development"}</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium">Database</h3>
            <p className="text-sm text-muted-foreground">SQLite (Local Database)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>Configure email service settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Email Provider</h3>
            <p className="text-sm text-muted-foreground">Console Email Provider (Development)</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium">From Address</h3>
            <p className="text-sm text-muted-foreground">
              {process.env.EMAIL_FROM || "noreply@example.com"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Email configuration is currently set to development mode. All emails are logged to the
            console instead of being sent.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Security and authentication configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Session Duration</h3>
            <p className="text-sm text-muted-foreground">7 days</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium">Password Requirements</h3>
            <p className="text-sm text-muted-foreground">Minimum 8 characters</p>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-medium">JWT Secret</h3>
            <p className="text-sm text-muted-foreground">
              {process.env.JWT_SECRET ? "Configured" : "Using default (insecure)"}
            </p>
            {!process.env.JWT_SECRET && (
              <p className="text-sm text-destructive">
                Warning: Using default JWT secret. Set JWT_SECRET environment variable in
                production.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
