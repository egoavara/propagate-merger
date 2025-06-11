import { HotfixManager } from '../hotfix-manager';

// Mock @actions/core and @actions/github
jest.mock('@actions/core');
jest.mock('@actions/github');

const mockGithub = require('@actions/github');

describe('HotfixManager', () => {
  let manager: HotfixManager;
  let mockOctokit: unknown;
  let mockContext: unknown;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        git: {
          getRef: jest.fn(),
          createRef: jest.fn(),
        },
        repos: {
          getBranch: jest.fn(),
          listBranches: jest.fn(),
        },
        pulls: {
          create: jest.fn(),
          merge: jest.fn(),
        },
      },
    };

    mockContext = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo',
      },
    };

    mockGithub.getOctokit.mockReturnValue(mockOctokit);
    mockGithub.context = mockContext;

    manager = new HotfixManager(mockOctokit as any, mockContext as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with octokit and context', () => {
      expect(manager).toBeInstanceOf(HotfixManager);
    });
  });

  describe('createHotfixBranch', () => {
    it('should handle missing tag error', async () => {
      const error = Object.assign(new Error('Not found'), { status: 404 });
      (mockOctokit as any).rest.git.getRef.mockRejectedValue(error);

      const result = await manager.createHotfixBranch('v1.0.0', 'hotfix.1');

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tag 'v1.0.0' does not exist");
    });
  });
});
