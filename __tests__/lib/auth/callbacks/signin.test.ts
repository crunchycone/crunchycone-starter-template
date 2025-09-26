import { signInCallback } from '@/lib/auth/callbacks/signin'
import * as userLookup from '@/lib/auth/utils/user-lookup'
import * as roleManagement from '@/lib/auth/utils/role-management'
import * as profileSync from '@/lib/auth/utils/profile-sync'
import type { User, Account, Profile } from 'next-auth'

// Mock the dependencies
jest.mock('@/lib/auth/utils/user-lookup')
jest.mock('@/lib/auth/utils/role-management')
jest.mock('@/lib/auth/utils/profile-sync')

const mockFindUserByEmail = userLookup.findUserByEmail as jest.MockedFunction<
  typeof userLookup.findUserByEmail
>
const mockAssignDefaultUserRole = roleManagement.assignDefaultUserRole as jest.MockedFunction<
  typeof roleManagement.assignDefaultUserRole
>
const mockSyncOAuthProfile = profileSync.syncOAuthProfile as jest.MockedFunction<
  typeof profileSync.syncOAuthProfile
>

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('signin callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
  })

  describe('signInCallback', () => {
    const baseUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }

    describe('OAuth providers (Google and GitHub)', () => {
      it('should handle existing Google user with roles', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }
        const profile: Profile = {
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        }

        const mockDbUser = {
          id: 'user-123',
          email: 'test@example.com',
          roles: [{ role: { name: 'user' } }],
        }

        mockFindUserByEmail.mockResolvedValue(mockDbUser as any)

        const result = await signInCallback({ user: baseUser, account, profile })

        expect(result).toBe(true)
        expect(mockFindUserByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockAssignDefaultUserRole).not.toHaveBeenCalled()
        expect(mockSyncOAuthProfile).toHaveBeenCalledWith('user-123', 'google', profile)
        expect(mockConsoleLog).toHaveBeenCalledWith('google sign-in attempt for: test@example.com')
      })

      it('should assign default role to existing user without roles', async () => {
        const account: Account = { provider: 'github', type: 'oauth' }
        const profile: Profile = { email: 'test@example.com', name: 'Test User' }

        const mockDbUser = {
          id: 'user-123',
          email: 'test@example.com',
          roles: [], // No roles
        }

        mockFindUserByEmail.mockResolvedValue(mockDbUser as any)
        mockAssignDefaultUserRole.mockResolvedValue(true)

        const result = await signInCallback({ user: baseUser, account, profile })

        expect(result).toBe(true)
        expect(mockAssignDefaultUserRole).toHaveBeenCalledWith('user-123')
        expect(mockConsoleLog).toHaveBeenCalledWith('Assigned user role to: test@example.com')
      })

      it('should handle new OAuth user', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }
        const profile: Profile = { email: 'newuser@example.com', name: 'New User' }

        mockFindUserByEmail.mockResolvedValue(null)

        const result = await signInCallback({
          user: { ...baseUser, email: 'newuser@example.com' },
          account,
          profile
        })

        expect(result).toBe(true)
        expect(mockFindUserByEmail).toHaveBeenCalledWith('newuser@example.com')
        expect(mockConsoleLog).toHaveBeenCalledWith('New google user: newuser@example.com')
        expect(mockSyncOAuthProfile).not.toHaveBeenCalled()
      })

      it('should reject OAuth user without email', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }
        const userWithoutEmail: User = { ...baseUser, email: null }

        const result = await signInCallback({
          user: userWithoutEmail,
          account
        })

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith('google user has no email address available')
        expect(mockFindUserByEmail).not.toHaveBeenCalled()
      })

      it('should show special message for GitHub users without email', async () => {
        const account: Account = { provider: 'github', type: 'oauth' }
        const userWithoutEmail: User = { ...baseUser, email: undefined }

        const result = await signInCallback({
          user: userWithoutEmail,
          account
        })

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith('github user has no email address available')
        expect(mockConsoleLog).toHaveBeenCalledWith('GitHub user needs to make email public for this app')
      })

      it('should handle profile sync without profile data', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }

        const mockDbUser = {
          id: 'user-123',
          email: 'test@example.com',
          roles: [{ role: { name: 'user' } }],
        }

        mockFindUserByEmail.mockResolvedValue(mockDbUser as any)

        const result = await signInCallback({
          user: baseUser,
          account
          // No profile
        })

        expect(result).toBe(true)
        expect(mockSyncOAuthProfile).not.toHaveBeenCalled()
      })

      it('should handle database errors gracefully', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }
        const profile: Profile = { email: 'test@example.com', name: 'Test User' }

        mockFindUserByEmail.mockRejectedValue(new Error('Database error'))

        const result = await signInCallback({ user: baseUser, account, profile })

        expect(result).toBe(true)
        expect(mockConsoleError).toHaveBeenCalledWith('Error in signIn callback:', expect.any(Error))
      })

      it('should handle role assignment failure', async () => {
        const account: Account = { provider: 'github', type: 'oauth' }

        const mockDbUser = {
          id: 'user-123',
          email: 'test@example.com',
          roles: [],
        }

        mockFindUserByEmail.mockResolvedValue(mockDbUser as any)
        mockAssignDefaultUserRole.mockResolvedValue(false)

        const result = await signInCallback({ user: baseUser, account })

        expect(result).toBe(true)
        expect(mockAssignDefaultUserRole).toHaveBeenCalledWith('user-123')
        expect(mockConsoleLog).not.toHaveBeenCalledWith('Assigned user role to: test@example.com')
      })
    })

    describe('Non-OAuth providers', () => {
      it('should allow credentials provider sign-in', async () => {
        const account: Account = { provider: 'credentials', type: 'credentials' }

        const result = await signInCallback({ user: baseUser, account })

        expect(result).toBe(true)
        expect(mockFindUserByEmail).not.toHaveBeenCalled()
        expect(mockConsoleLog).not.toHaveBeenCalled()
      })

      it('should allow email provider sign-in', async () => {
        const account: Account = { provider: 'email', type: 'email' }

        const result = await signInCallback({ user: baseUser, account })

        expect(result).toBe(true)
        expect(mockFindUserByEmail).not.toHaveBeenCalled()
      })

      it('should handle null account', async () => {
        const result = await signInCallback({ user: baseUser, account: null })

        expect(result).toBe(true)
        expect(mockFindUserByEmail).not.toHaveBeenCalled()
      })
    })

    describe('Edge cases', () => {
      it('should handle empty user email for OAuth', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }
        const userWithEmptyEmail: User = { ...baseUser, email: '' }

        const result = await signInCallback({
          user: userWithEmptyEmail,
          account
        })

        expect(result).toBe(false)
        expect(mockConsoleError).toHaveBeenCalledWith('google user has no email address available')
      })

      it('should handle user with roles containing multiple roles', async () => {
        const account: Account = { provider: 'google', type: 'oauth' }

        const mockDbUser = {
          id: 'user-123',
          email: 'test@example.com',
          roles: [
            { role: { name: 'user' } },
            { role: { name: 'admin' } },
          ],
        }

        mockFindUserByEmail.mockResolvedValue(mockDbUser as any)

        const result = await signInCallback({ user: baseUser, account })

        expect(result).toBe(true)
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Existing user found: test@example.com, roles:',
          ['user', 'admin']
        )
        expect(mockAssignDefaultUserRole).not.toHaveBeenCalled()
      })
    })
  })
})