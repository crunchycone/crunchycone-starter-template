// Mock for crunchycone-lib

// Mock storage provider instance
const mockStorageProvider = {
  uploadFile: jest.fn().mockResolvedValue({
    success: true,
    external_id: "test-id",
    key: "test/file.txt",
    url: "http://example.com/file.txt",
    size: 1234,
    contentType: "text/plain",
    visibility: "public" as const,
  }),
  getFileStream: jest.fn().mockResolvedValue({
    stream: new ReadableStream(),
    contentType: "text/plain",
    contentLength: 1234,
    streamType: "web" as const,
    isPartialContent: false,
  }),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  deleteFileByExternalId: jest.fn().mockResolvedValue(undefined),
  getFileUrl: jest.fn().mockResolvedValue("http://example.com/file.txt"),
  getFileUrlByExternalId: jest.fn().mockResolvedValue("http://example.com/file.txt"),
  fileExists: jest.fn().mockResolvedValue(true),
  fileExistsByExternalId: jest.fn().mockResolvedValue(true),
  findFileByExternalId: jest.fn().mockResolvedValue({
    external_id: "test-id",
    key: "test/file.txt",
    url: "http://example.com/file.txt",
    size: 1234,
    contentType: "text/plain",
  }),
  listFiles: jest.fn().mockResolvedValue({
    files: [],
    hasMore: false,
  }),
  searchFiles: jest.fn().mockResolvedValue({
    files: [],
    hasMore: false,
  }),
  isAvailable: jest.fn().mockResolvedValue(true),
  setFileVisibility: jest.fn().mockResolvedValue({
    success: true,
    requestedVisibility: "public" as const,
    actualVisibility: "public" as const,
  }),
  setFileVisibilityByExternalId: jest.fn().mockResolvedValue({
    success: true,
    requestedVisibility: "public" as const,
    actualVisibility: "public" as const,
  }),
  getFileVisibility: jest.fn().mockResolvedValue({
    visibility: "public" as const,
    canMakePublic: true,
    canMakePrivate: true,
    supportsTemporaryAccess: false,
  }),
  getFileVisibilityByExternalId: jest.fn().mockResolvedValue({
    visibility: "public" as const,
    canMakePublic: true,
    canMakePrivate: true,
    supportsTemporaryAccess: false,
  }),
};

// Mock storage service functions
export const initializeStorageProvider = jest.fn();
export const getStorageProvider = jest.fn(() => mockStorageProvider);

export const createEmailService = jest.fn(() => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  testConnection: jest.fn().mockResolvedValue({ success: true }),
}));

export const sendTemplatedEmail = jest.fn().mockResolvedValue({ success: true });
