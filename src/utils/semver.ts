export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export function parseVersion(version: string): SemanticVersion | null {
  const cleanVersion = version.replace(/^v/, '');

  const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z\-\.]+))?(?:\+([0-9A-Za-z\-\.]+))?$/;
  const match = cleanVersion.match(regex);

  if (!match) {
    return null;
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  if (!v1 || !v2) {
    throw new Error(`Invalid version format: ${!v1 ? version1 : version2}`);
  }

  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }

  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }

  if (v1.patch !== v2.patch) {
    return v1.patch - v2.patch;
  }

  if (!v1.prerelease && !v2.prerelease) {
    return 0;
  }

  if (!v1.prerelease && v2.prerelease) {
    return 1;
  }

  if (v1.prerelease && !v2.prerelease) {
    return -1;
  }

  return v1.prerelease?.localeCompare(v2.prerelease || '') || 0;
}

export function isVersionNewer(baseVersion: string, targetVersion: string): boolean {
  return compareVersions(targetVersion, baseVersion) > 0;
}

export function isVersionSame(version1: string, version2: string): boolean {
  return compareVersions(version1, version2) === 0;
}

export function extractVersionFromBranch(branchName: string): string | null {
  const patterns = [/^release\/v?(.+)$/, /^hotfix\/v?(.+)$/, /^v?(\d+\.\d+\.\d+(?:-[^\/]+)?)$/];

  for (const pattern of patterns) {
    const match = branchName.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
