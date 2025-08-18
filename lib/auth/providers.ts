/**
 * Utility functions for OAuth provider configuration
 * Used by UI components to determine which providers are available
 */

export interface ProviderConfig {
  id: string
  name: string
  type: 'oauth' | 'email' | 'credentials'
  icon?: string
  enabled: boolean
}

/**
 * Check if Google OAuth is enabled based on environment variables
 * Note: On client-side, we only check the toggle since credentials are server-only
 */
export function isGoogleAuthEnabled(): boolean {
  // Client-side: only check the public toggle
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"
  }
  
  // Server-side: check toggle and credentials
  return (
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" &&
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET
  )
}

/**
 * Check if GitHub OAuth is enabled based on environment variables
 * Note: On client-side, we only check the toggle since credentials are server-only
 */
export function isGitHubAuthEnabled(): boolean {
  // Client-side: only check the public toggle
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true"
  }
  
  // Server-side: check toggle and credentials
  return (
    process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true" &&
    !!process.env.GITHUB_CLIENT_ID &&
    !!process.env.GITHUB_CLIENT_SECRET
  )
}

/**
 * Check if Email/Password authentication is enabled based on environment variables
 * Enabled by default (only disabled if explicitly set to "false")
 */
export function isEmailPasswordEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD !== "false"
}

/**
 * Check if Magic Link authentication is enabled based on environment variables
 */
export function isMagicLinkEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MAGIC_LINK === "true"
}

/**
 * Get all available providers for UI display
 */
export function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = []

  // Add email/password if enabled (enabled by default)
  if (isEmailPasswordEnabled()) {
    providers.push({
      id: 'credentials',
      name: 'Email & Password',
      type: 'credentials',
      enabled: true
    })
  }

  // Add Magic Link if enabled
  if (isMagicLinkEnabled()) {
    providers.push({
      id: 'email',
      name: 'Magic Link',
      type: 'email',
      enabled: true
    })
  }

  // Add Google OAuth if enabled
  if (isGoogleAuthEnabled()) {
    providers.push({
      id: 'google',
      name: 'Continue with Google',
      type: 'oauth',
      icon: 'google', // Will be handled by the UI component
      enabled: true
    })
  }

  // Add GitHub OAuth if enabled
  if (isGitHubAuthEnabled()) {
    providers.push({
      id: 'github',
      name: 'Continue with GitHub',
      type: 'oauth',
      icon: 'github', // Will be handled by the UI component
      enabled: true
    })
  }

  return providers
}

/**
 * Get only OAuth providers (excludes credentials and email)
 */
export function getOAuthProviders(): ProviderConfig[] {
  return getAvailableProviders().filter(provider => provider.type === 'oauth')
}

/**
 * Get only email providers (magic link)
 */
export function getEmailProviders(): ProviderConfig[] {
  return getAvailableProviders().filter(provider => provider.type === 'email')
}

/**
 * Check if any OAuth providers are available
 */
export function hasOAuthProviders(): boolean {
  return getOAuthProviders().length > 0
}

/**
 * Check if magic link provider is available
 */
export function hasMagicLinkProvider(): boolean {
  return getEmailProviders().length > 0
}