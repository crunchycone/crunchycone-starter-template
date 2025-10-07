export async function redirectCallback({ url, baseUrl }: { url: string; baseUrl: string }) {
  console.log("Redirect callback:", { url, baseUrl });

  // Never redirect to signin after successful authentication
  // This happens with magic links - redirect to home instead
  if (url.includes("/auth/signin") || url === `${baseUrl}/auth/signin`) {
    console.log("Preventing redirect to signin, going to home instead");
    return `${baseUrl}/`;
  }

  // Default: if no specific redirect, go to home
  if (url === baseUrl) {
    console.log("No specific redirect URL, sending to home");
    return `${baseUrl}/`;
  }

  // Allows relative callback URLs
  if (url.startsWith("/")) return `${baseUrl}${url}`;

  // Allows callback URLs on the same origin
  try {
    if (new URL(url).origin === baseUrl) return url;
  } catch {
    // Invalid URL, fall through to default
  }

  // Default to home
  return `${baseUrl}/`;
}
