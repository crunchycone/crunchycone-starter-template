import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AccountLinking } from "@/components/profile/AccountLinking";
import { UserDetails } from "@/components/profile/UserDetails";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Get user details with OAuth accounts
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
      deleted_at: null,
    },
    include: {
      profile: true,
      roles: {
        where: { deleted_at: null },
        include: { role: true },
      },
      accounts: {
        where: {
          type: "oauth",
          // Only show active OAuth accounts
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Get user's initials for avatar fallback
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const userInitials = getInitials(
    user.name || `${user.profile?.first_name || ""} ${user.profile?.last_name || ""}`.trim(),
    user.email
  );
  const hasOAuthAccounts = user.accounts.length > 0;

  // Determine if user has email+password authentication
  const hasEmailPassword = user.password !== null;

  // Can disconnect OAuth if they have email+password OR multiple OAuth providers
  const _canDisconnectOAuth = hasEmailPassword || user.accounts.length > 1;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
            <AvatarFallback className="text-2xl font-semibold">{userInitials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user.name ||
                `${user.profile?.first_name || ""} ${user.profile?.last_name || ""}`.trim() ||
                "User"}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>
            {user.roles.some((userRole) => userRole.role.name === "admin") && (
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="secondary">admin</Badge>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-2">
          {/* User Details */}
          <UserDetails user={user} />

          {/* Account Linking */}
          <AccountLinking
            user={user}
            hasOAuthAccounts={hasOAuthAccounts}
            hasEmailPassword={hasEmailPassword}
          />
        </div>
      </div>
    </div>
  );
}
