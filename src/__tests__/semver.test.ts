import {
  compareVersions,
  extractVersionFromBranch,
  isVersionNewer,
  parseVersion,
} from '../utils/semver';

describe('semver utilities', () => {
  describe('parseVersion', () => {
    it('should parse basic semantic versions', () => {
      const version = parseVersion('v1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('should parse versions with prerelease', () => {
      const version = parseVersion('v1.2.3-hotfix.1');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'hotfix.1',
      });
    });

    it('should parse versions without v prefix', () => {
      const version = parseVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
      });
    });

    it('should return null for invalid versions', () => {
      expect(parseVersion('invalid')).toBeNull();
      expect(parseVersion('1.2')).toBeNull();
      expect(parseVersion('')).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      expect(compareVersions('v2.0.0', 'v1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('v1.0.0', 'v2.0.0')).toBeLessThan(0);
      expect(compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
    });

    it('should compare minor versions correctly', () => {
      expect(compareVersions('v1.2.0', 'v1.1.0')).toBeGreaterThan(0);
      expect(compareVersions('v1.1.0', 'v1.2.0')).toBeLessThan(0);
    });

    it('should compare patch versions correctly', () => {
      expect(compareVersions('v1.0.2', 'v1.0.1')).toBeGreaterThan(0);
      expect(compareVersions('v1.0.1', 'v1.0.2')).toBeLessThan(0);
    });

    it('should handle prerelease versions', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0-hotfix.1')).toBeGreaterThan(0);
      expect(compareVersions('v1.0.0-hotfix.1', 'v1.0.0')).toBeLessThan(0);
      expect(compareVersions('v1.0.0-hotfix.2', 'v1.0.0-hotfix.1')).toBeGreaterThan(0);
    });
  });

  describe('isVersionNewer', () => {
    it('should return true when target is newer than base', () => {
      expect(isVersionNewer('v1.0.0', 'v1.0.1')).toBe(true);
      expect(isVersionNewer('v1.0.0', 'v1.1.0')).toBe(true);
      expect(isVersionNewer('v1.0.0', 'v2.0.0')).toBe(true);
    });

    it('should return false when target is older or equal', () => {
      expect(isVersionNewer('v1.0.1', 'v1.0.0')).toBe(false);
      expect(isVersionNewer('v1.0.0', 'v1.0.0')).toBe(false);
    });
  });

  describe('extractVersionFromBranch', () => {
    it('should extract version from release branches', () => {
      expect(extractVersionFromBranch('release/v1.2.3')).toBe('1.2.3');
      expect(extractVersionFromBranch('release/1.2.3')).toBe('1.2.3');
    });

    it('should extract version from version tags', () => {
      expect(extractVersionFromBranch('v1.2.3')).toBe('1.2.3');
      expect(extractVersionFromBranch('1.2.3')).toBe('1.2.3');
    });

    it('should return null for non-version branches', () => {
      expect(extractVersionFromBranch('main')).toBeNull();
      expect(extractVersionFromBranch('dev')).toBeNull();
      expect(extractVersionFromBranch('feature/test')).toBeNull();
    });
  });
});
