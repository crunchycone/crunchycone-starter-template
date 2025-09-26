import { prismaAuth } from "@/lib/auth/prisma-auth";

interface ProfileData {
  name?: string;
  picture?: string;
  avatar_url?: string;
}

export async function syncOAuthProfile(userId: string, provider: string, profile: ProfileData) {
  try {
    const dbUser = await prismaAuth.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) return;

    const updates: { name?: string; image?: string } = {};

    // Update name if missing
    if (!dbUser.name && profile.name) {
      updates.name = profile.name;
      console.log(`Updating user name from ${provider}: ${profile.name}`);
    }

    // Update avatar if missing OR if it has changed
    const avatarUrl = provider === "google" ? profile.picture : profile.avatar_url;

    console.log(`${provider} profile data:`, {
      name: profile.name,
      avatarUrl,
      picture: profile.picture,
      avatar_url: profile.avatar_url,
    });

    if (avatarUrl) {
      if (!dbUser.image) {
        updates.image = avatarUrl;
        console.log(`Setting user avatar from ${provider}: ${avatarUrl}`);
      } else if (dbUser.image !== avatarUrl) {
        updates.image = avatarUrl;
        console.log(`Updating changed user avatar from ${provider}: ${avatarUrl}`);
      }
    } else {
      console.log(`No avatar URL found for ${provider} user`);
    }

    if (Object.keys(updates).length > 0) {
      await prismaAuth.user.update({
        where: { id: userId },
        data: updates,
      });
      console.log(`Updated profile for user: ${dbUser.email}`);
    }
  } catch (error) {
    console.error("Error syncing OAuth profile:", error);
  }
}
