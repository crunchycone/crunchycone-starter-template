import { createCredentialsProvider } from "./credentials";
import { createEmailProvider } from "./email";
import { createGoogleProvider } from "./google";
import { createGitHubProvider } from "./github";

// Build providers array dynamically based on environment
export function buildProviders() {
  const providers = [];

  // Add each provider if enabled and configured
  const credentialsProvider = createCredentialsProvider();
  if (credentialsProvider) {
    providers.push(credentialsProvider);
  }

  const emailProvider = createEmailProvider();
  if (emailProvider) {
    providers.push(emailProvider);
  }

  const googleProvider = createGoogleProvider();
  if (googleProvider) {
    providers.push(googleProvider);
  }

  const githubProvider = createGitHubProvider();
  if (githubProvider) {
    providers.push(githubProvider);
  }

  return providers;
}
