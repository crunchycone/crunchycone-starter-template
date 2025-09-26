import { sessionCallback } from '@/lib/auth/callbacks/session'
import type { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

describe('session callback', () => {
  describe('sessionCallback', () => {
    it('should include user ID and roles from token', async () => {
      const session: Session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test User',
          roles: [],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token: JWT = {
        id: 'user-123',
        roles: ['user', 'admin'],
        email: 'test@example.com',
        name: 'Test User',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-123')
      expect(result.user.roles).toEqual(['user', 'admin'])
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.name).toBe('Test User')
    })

    it('should handle token with empty roles', async () => {
      const session: Session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test User',
          roles: [],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token: JWT = {
        id: 'user-123',
        roles: [],
        email: 'test@example.com',
        name: 'Test User',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-123')
      expect(result.user.roles).toEqual([])
    })

    it('should handle token without roles property', async () => {
      const session: Session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test User',
          roles: [],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token: JWT = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-123')
      expect(result.user.roles).toBeUndefined()
    })

    it('should return session unchanged when token is null', async () => {
      const session: Session = {
        user: {
          id: 'existing-id',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['existing-role'],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token = null as unknown as JWT

      const result = await sessionCallback({ session, token })

      expect(result).toEqual(session)
      expect(result.user.id).toBe('existing-id')
      expect(result.user.roles).toEqual(['existing-role'])
    })

    it('should return session unchanged when token is undefined', async () => {
      const session: Session = {
        user: {
          id: 'existing-id',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['existing-role'],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token = undefined as unknown as JWT

      const result = await sessionCallback({ session, token })

      expect(result).toEqual(session)
      expect(result.user.id).toBe('existing-id')
      expect(result.user.roles).toEqual(['existing-role'])
    })

    it('should preserve other session properties', async () => {
      const session: Session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          roles: [],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token: JWT = {
        id: 'user-123',
        roles: ['user'],
        email: 'test@example.com',
        name: 'Test User',
      }

      const result = await sessionCallback({ session, token })

      expect(result.expires).toBe('2024-12-31T23:59:59.000Z')
      expect(result.user.image).toBe('https://example.com/avatar.jpg')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.name).toBe('Test User')
    })

    it('should handle token with additional properties', async () => {
      const session: Session = {
        user: {
          id: '',
          email: 'test@example.com',
          name: 'Test User',
          roles: [],
        },
        expires: '2024-12-31T23:59:59.000Z',
      }

      const token: JWT = {
        id: 'user-123',
        roles: ['user'],
        email: 'test@example.com',
        name: 'Test User',
        iat: 1234567890,
        exp: 1234567890,
        sub: 'user-123',
      }

      const result = await sessionCallback({ session, token })

      expect(result.user.id).toBe('user-123')
      expect(result.user.roles).toEqual(['user'])
    })
  })
})