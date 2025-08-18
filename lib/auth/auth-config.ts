import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import { prismaAuth } from "@/lib/auth/prisma-auth"
import bcrypt from "bcryptjs"

// Build providers array dynamically based on environment
const buildProviders = () => {
  const providers = [];

  // Conditionally add email/password provider (enabled by default)
  if (process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD !== "false") {
    providers.push(
      CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user with roles and profile
          const user = await prismaAuth.user.findUnique({
            where: { 
              email: credentials.email as string,
              deleted_at: null
            },
            include: {
              profile: true,
              roles: {
                where: { deleted_at: null },
                include: {
                  role: true
                }
              }
            }
          })

          if (!user || !user.password) {
            return null
          }

          // Verify password using bcrypt
          const isValidPassword = await bcrypt.compare(
            credentials.password as string, 
            user.password
          )

          if (!isValidPassword) {
            return null
          }

          // Update last signed in
          await prismaAuth.user.update({
            where: { id: user.id },
            data: { last_signed_in: new Date() }
          })

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            name: user.name || `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || null,
            image: user.image,
            roles: user.roles.map(ur => ur.role.name)
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
      })
    );
  }

  // Conditionally add Email (Magic Link) provider
  if (process.env.NEXT_PUBLIC_ENABLE_MAGIC_LINK === "true") {
    providers.push(
      EmailProvider({
        name: "email",
        from: process.env.EMAIL_FROM || "noreply@example.com",
        // Custom email sending function (console provider)
        sendVerificationRequest: async ({ identifier: email, url, provider }) => {
          console.log(`
🔗 Magic Link Email
==================
To: ${email}
From: ${provider.from}

Click the link below to sign in:
${url}

This link will expire in 24 hours.
          `)
        }
      })
    );
  }

  // Conditionally add Google OAuth provider
  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  return providers;
};

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prismaAuth),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: buildProviders(),
  callbacks: {
    async redirect({ url, baseUrl, token }) {
      console.log('Redirect callback:', { url, baseUrl, hasToken: !!token })
      
      // If user is signed in and being redirected to signin page, redirect to home instead
      if (token && (url.includes('/auth/signin') || url === `${baseUrl}/auth/signin`)) {
        console.log('Redirecting authenticated user to home instead of signin')
        return `${baseUrl}/`
      }
      
      // Default: if no specific redirect and user is authenticated, go to home
      if (token && url === baseUrl) {
        console.log('No specific redirect URL, sending authenticated user to home')
        return `${baseUrl}/`
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      
      // Default to home for authenticated users, signin for others
      return token ? `${baseUrl}/` : `${baseUrl}/auth/signin`
    },
    async jwt({ token, user, account }) {
      // Include roles in JWT token
      if (user) {
        console.log('JWT callback - user:', { id: user.id, email: user.email, name: user.name })
        
        // For OAuth users, we need to fetch roles from database
        if (account?.provider === 'google') {
          try {
            const dbUser = await prismaAuth.user.findUnique({
              where: { id: user.id },
              include: {
                roles: {
                  where: { deleted_at: null },
                  include: { role: true }
                }
              }
            })
            token.roles = dbUser?.roles.map(ur => ur.role.name) || []
          } catch (error) {
            console.error('Error fetching user roles:', error)
            token.roles = []
          }
        } else {
          token.roles = (user as any).roles || []
        }
        
        token.id = user.id
        console.log('JWT token created with roles:', token.roles)
      }
      return token
    },
    async session({ session, token }) {
      // Include roles and user ID in session
      if (token) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Handle OAuth account linking and role assignment
      if (account?.provider === 'google') {
        console.log(`Google sign-in attempt for: ${user.email}`)
        
        try {
          // Check if user exists in our database
          const dbUser = await prismaAuth.user.findUnique({
            where: { 
              email: user.email as string,
              deleted_at: null
            },
            include: {
              roles: {
                where: { deleted_at: null },
                include: { role: true }
              }
            }
          })

          if (dbUser) {
            console.log(`Existing user found: ${user.email}, roles:`, dbUser.roles.map(r => r.role.name))
            
            // Check if user has any roles, if not assign default "user" role
            if (dbUser.roles.length === 0) {
              const userRole = await prismaAuth.role.findUnique({
                where: { name: 'user' }
              })
              
              if (userRole) {
                await prismaAuth.userRole.create({
                  data: {
                    user_id: dbUser.id,
                    role_id: userRole.id
                  }
                })
                console.log(`Assigned user role to: ${user.email}`)
              }
            }

            // Update user profile with Google data
            if (profile) {
              const updates: { name?: string; image?: string } = {}
              
              // Update name if missing
              if (!dbUser.name && profile.name) {
                updates.name = profile.name
                console.log(`Updating user name from Google: ${profile.name}`)
              }
              
              // Update avatar if missing OR if it has changed
              if (profile.picture) {
                if (!dbUser.image) {
                  updates.image = profile.picture
                  console.log(`Setting user avatar from Google: ${profile.picture}`)
                } else if (dbUser.image !== profile.picture) {
                  updates.image = profile.picture
                  console.log(`Updating changed user avatar from Google: ${profile.picture}`)
                }
              }
              
              if (Object.keys(updates).length > 0) {
                await prismaAuth.user.update({
                  where: { id: dbUser.id },
                  data: updates
                })
                console.log(`Updated profile for user: ${user.email}`)
              }
            }
          } else {
            console.log(`New Google user: ${user.email}`)
            // User will be created by Auth.js, but we need to assign role after creation
            // This will be handled in the events.signIn callback
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
        }
      }
      
      return true
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email}, isNewUser: ${isNewUser}`)
      
      // Assign default role to new OAuth users
      if (isNewUser && account?.provider === 'google') {
        try {
          const userRole = await prismaAuth.role.findUnique({
            where: { name: 'user' }
          })
          
          if (userRole) {
            await prismaAuth.userRole.create({
              data: {
                user_id: user.id,
                role_id: userRole.id
              }
            })
            console.log(`Assigned user role to new Google user: ${user.email}`)
          }
        } catch (error) {
          console.error('Error assigning role to new user:', error)
        }
      }
    }
  }
}