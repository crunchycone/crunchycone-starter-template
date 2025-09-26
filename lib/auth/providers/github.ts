import GitHubProvider from "next-auth/providers/github";

async function fetchGitHubEmail(accessToken: string) {
  try {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${accessToken}`,
        "User-Agent": "NextAuth",
      },
    });
    const emails = await response.json();

    // Find primary email
    const primaryEmail = emails?.find(
      (email: { primary?: boolean; email?: string }) => email.primary
    );
    return primaryEmail?.email;
  } catch (error) {
    console.error("Error fetching GitHub emails:", error);
    return null;
  }
}

export function createGitHubProvider() {
  const enableGithubAuth = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH;

  if (
    (enableGithubAuth !== "true" && enableGithubAuth !== "1") ||
    !process.env.GITHUB_CLIENT_ID ||
    !process.env.GITHUB_CLIENT_SECRET
  ) {
    return null;
  }

  return GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "read:user user:email",
      },
    },
    profile: async (profile, tokens) => {
      // If no email in profile, try to fetch it from GitHub API
      if (!profile.email) {
        const primaryEmail = await fetchGitHubEmail(tokens.access_token!);
        if (primaryEmail) {
          profile.email = primaryEmail;
          console.log("GitHub: Retrieved primary email from API");
        }
      }

      return {
        id: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url,
      };
    },
  });
}
