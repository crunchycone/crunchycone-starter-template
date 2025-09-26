import { jwtCallback } from '@/lib/auth/callbacks/jwt'
import * as roleManagement from '@/lib/auth/utils/role-management'

// Mock the dependencies
jest.mock('@/lib/auth/utils/role-management')

const mockGetUserRoles = roleManagement.getUserRoles as jest.MockedFunction<
  typeof roleManagement.getUserRoles
>

describe('jwt callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('jwtCallback', () => {
    it('should include user ID and roles for credentials provider', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'admin'],
      }
      const account = { provider: 'credentials' }

      const result = await jwtCallback({ token, user, account })

      expect(result.id).toBe('user-123')
      expect(result.roles).toEqual(['user', 'admin'])
      expect(mockGetUserRoles).not.toHaveBeenCalled()
    })

    it('should fetch roles from database for Google OAuth', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      const account = { provider: 'google' }

      mockGetUserRoles.mockResolvedValue(['user'])

      const result = await jwtCallback({ token, user, account })

      expect(result.id).toBe('user-123')
      expect(result.roles).toEqual(['user'])
      expect(mockGetUserRoles).toHaveBeenCalledWith('user-123')
    })

    it('should fetch roles from database for GitHub OAuth', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      const account = { provider: 'github' }

      mockGetUserRoles.mockResolvedValue(['user', 'admin'])

      const result = await jwtCallback({ token, user, account })

      expect(result.id).toBe('user-123')
      expect(result.roles).toEqual(['user', 'admin'])
      expect(mockGetUserRoles).toHaveBeenCalledWith('user-123')
    })

    it('should handle empty roles from database', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      const account = { provider: 'google' }

      mockGetUserRoles.mockResolvedValue([])

      const result = await jwtCallback({ token, user, account })

      expect(result.roles).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      const account = { provider: 'google' }

      mockGetUserRoles.mockRejectedValue(new Error('Database error'))

      const result = await jwtCallback({ token, user, account })

      expect(result.roles).toEqual([])
    })

    it('should return token unchanged when user is not provided', async () => {
      const token = { existingData: 'test' }
      const user = undefined
      const account = null

      const result = await jwtCallback({ token, user, account })

      expect(result).toEqual({ existingData: 'test' })
      expect(mockGetUserRoles).not.toHaveBeenCalled()
    })

    it('should handle user without roles property for credentials', async () => {
      const token = {}
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        // No roles property
      }
      const account = { provider: 'credentials' }

      const result = await jwtCallback({ token, user, account })

      expect(result.roles).toEqual([])
    })

    it('should preserve existing token data', async () => {
      const token = {
        existingField: 'existing-value',
        anotherField: 123,
      }
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
      }
      const account = { provider: 'credentials' }

      const result = await jwtCallback({ token, user, account })

      expect(result.existingField).toBe('existing-value')
      expect(result.anotherField).toBe(123)
      expect(result.id).toBe('user-123')
      expect(result.roles).toEqual(['user'])
    })
  })
})