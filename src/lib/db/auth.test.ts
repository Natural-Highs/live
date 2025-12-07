/**
 * Unit tests for authentication business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 * Following Incremental Verification directive: Verify this milestone before proceeding
 */
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';
import { registerUser, signInUser } from './auth';

// Mock Firebase Admin
vi.mock('$lib/firebase/firebase.admin', () => ({
  adminAuth: {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
  },
}));

describe('Authentication Business Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should return false when passwords do not match', async () => {
      const result = await registerUser('test@example.com', 'password123', 'differentPassword');

      expect(result).toBe(false);
      expect(adminAuth.createUser).not.toHaveBeenCalled();
    });

    it('should create user and Firestore document when passwords match', async () => {
      const mockUid = 'user123';
      const mockUserRecord = { uid: mockUid };
      const mockDoc = {
        set: vi.fn().mockResolvedValue(undefined),
      };
      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockDoc),
      };

      (adminAuth.createUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserRecord);
      (adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(mockCollection as never);

      const result = await registerUser('test@example.com', 'password123', 'password123');

      expect(result).toBe(true);
      expect(adminAuth.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(adminDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith(mockUid);
      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          uid: mockUid,
          isAdmin: false,
          signedConsentForm: false,
        })
      );
    });

    it('should set createdAt timestamp when creating user document', async () => {
      const mockUid = 'user456';
      const mockUserRecord = { uid: mockUid };
      const mockDoc = {
        set: vi.fn().mockResolvedValue(undefined),
      };
      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockDoc),
      };

      (adminAuth.createUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserRecord);
      (adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(mockCollection as never);

      const beforeTime = new Date();
      await registerUser('test@example.com', 'password123', 'password123');
      const afterTime = new Date();

      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: expect.any(Date),
        })
      );

      const setCall = mockDoc.set.mock.calls[0][0];
      const createdAt = setCall.createdAt as Date;
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should return false when user creation fails', async () => {
      (adminAuth.createUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User creation failed')
      );

      const result = await registerUser('test@example.com', 'password123', 'password123');

      expect(result).toBe(false);
    });

    it('should return false when Firestore document creation fails', async () => {
      const mockUid = 'user789';
      const mockUserRecord = { uid: mockUid };
      const mockDoc = {
        set: vi.fn().mockRejectedValue(new Error('Firestore error')),
      };
      const mockCollection = {
        doc: vi.fn().mockReturnValue(mockDoc),
      };

      (adminAuth.createUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserRecord);
      (adminDb.collection as ReturnType<typeof vi.fn>).mockReturnValue(mockCollection as never);

      const result = await registerUser('test@example.com', 'password123', 'password123');

      expect(result).toBe(false);
    });
  });

  describe('signInUser', () => {
    it('should return true when user exists', async () => {
      const mockUserRecord = { uid: 'user123', email: 'test@example.com' };

      (adminAuth.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserRecord);

      const result = await signInUser('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(adminAuth.getUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return false when user does not exist', async () => {
      (adminAuth.getUserByEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User not found')
      );

      const result = await signInUser('nonexistent@example.com', 'password123');

      expect(result).toBe(false);
      expect(adminAuth.getUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should return false when getUserByEmail throws error', async () => {
      (adminAuth.getUserByEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await signInUser('test@example.com', 'password123');

      expect(result).toBe(false);
    });

    it('should ignore password parameter (not used in implementation)', async () => {
      const mockUserRecord = { uid: 'user123', email: 'test@example.com' };

      (adminAuth.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserRecord);

      const result = await signInUser('test@example.com', 'any-password-or-empty');

      expect(result).toBe(true);
      // Password is not used in the implementation (prefixed with _)
    });

    it('should handle null userRecord (unreachable but covered for completeness)', async () => {
      // This branch is technically unreachable since getUserByEmail always returns or throws
      // but we test it for code coverage completeness
      // biome-ignore lint/suspicious/noExplicitAny: Testing unreachable branch requires type override
      (adminAuth.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null as any);

      const result = await signInUser('test@example.com', 'password123');

      expect(result).toBe(false);
    });
  });
});
