import { syncOAuthProfile } from '@/lib/auth/utils/profile-sync'
import { prismaAuth } from '@/lib/auth/prisma-auth'

// Mock the dependencies
jest.mock('@/lib/auth/prisma-auth')

const mockPrismaAuth = prismaAuth as jest.Mocked<typeof prismaAuth>

describe('profile-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('syncOAuthProfile', () => {
    it('should update user profile with Google OAuth data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        image: null,
      }

      const profileData = {
        name: 'John Doe',
        picture: 'https://google.com/avatar.jpg',
      }

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaAuth.user.update.mockResolvedValue({ ...mockUser, ...profileData })

      await syncOAuthProfile('user-123', 'google', profileData)

      expect(mockPrismaAuth.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe',
          image: 'https://google.com/avatar.jpg',
        },
      })
    })

    it('should update user profile with GitHub OAuth data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        image: null,
      }

      const profileData = {
        name: 'Jane Smith',
        avatar_url: 'https://github.com/avatar.jpg',
      }

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaAuth.user.update.mockResolvedValue({ ...mockUser, ...profileData })

      await syncOAuthProfile('user-123', 'github', profileData)

      expect(mockPrismaAuth.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'Jane Smith',
          image: 'https://github.com/avatar.jpg',
        },
      })
    })

    it('should not update when user already has name and image', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Existing Name',
        image: 'https://existing.com/avatar.jpg',
      }

      const profileData = {
        name: 'New Name',
        picture: 'https://new.com/avatar.jpg',
      }

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser)

      await syncOAuthProfile('user-123', 'google', profileData)

      expect(mockPrismaAuth.user.update).not.toHaveBeenCalled()
    })

    it('should update image when it has changed', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'John Doe',
        image: 'https://old.com/avatar.jpg',
      }

      const profileData = {
        name: 'John Doe',
        picture: 'https://new.com/avatar.jpg',
      }

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaAuth.user.update.mockResolvedValue({ ...mockUser, ...profileData })

      await syncOAuthProfile('user-123', 'google', profileData)

      expect(mockPrismaAuth.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          image: 'https://new.com/avatar.jpg',
        },
      })
    })

    it('should handle missing user gracefully', async () => {
      mockPrismaAuth.user.findUnique.mockResolvedValue(null)

      await syncOAuthProfile('user-123', 'google', { name: 'Test' })

      expect(mockPrismaAuth.user.update).not.toHaveBeenCalled()
    })

    it('should handle profile data without avatar URL', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        image: null,
      }

      const profileData = {
        name: 'John Doe',
      }

      mockPrismaAuth.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaAuth.user.update.mockResolvedValue({ ...mockUser, ...profileData })

      await syncOAuthProfile('user-123', 'google', profileData)

      expect(mockPrismaAuth.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe',
        },
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrismaAuth.user.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(syncOAuthProfile('user-123', 'google', { name: 'Test' })).resolves.not.toThrow()
    })
  })
})