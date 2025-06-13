import * as core from '@actions/core';
import type { Context } from '@actions/github/lib/context';
import type { Octokit } from '@octokit/rest';
import { extractVersionFromBranch, isVersionNewer } from './utils/semver';

export interface CreateHotfixResult {
  success: boolean;
  hotfixBranch?: string;
  baseVersion?: string;
  error?: string;
}

export interface PropagateHotfixOptions {
  version: string;
  hotfixSuffix: string;
  directMergeBranches: string[];
  updateThenMergeBranches: string[];
  autoCleanup: boolean;
}

export interface PropagateHotfixResult {
  status: 'success' | 'partial' | 'failed';
  successfulBranches?: string[];
  failedBranches?: string[];
  createdPRs?: number[];
  error?: string;
}

export class HotfixManager {
  constructor(
    private octokit: Octokit,
    private context: Context
  ) {}

  async createHotfixBranch(version: string, hotfixSuffix: string): Promise<CreateHotfixResult> {
    const { owner, repo } = this.context.repo;
    const cleanVersion = version.replace(/^v/, '');
    const hotfixBranch = `hotfix/v${cleanVersion}-${hotfixSuffix}`;
    const tagName = `v${cleanVersion}`;

    try {
      core.info(`🔍 Checking if tag ${tagName} exists...`);

      const tagExists = await this.tagExists(tagName);
      if (!tagExists) {
        return {
          success: false,
          error: `Tag '${tagName}' does not exist`,
        };
      }

      core.info('🔍 Checking for existing hotfix branches...');

      const existingHotfix = await this.findExistingHotfixBranches();
      if (existingHotfix.length > 0) {
        return {
          success: false,
          error: `Existing hotfix branch found: ${existingHotfix.join(', ')}. Only one hotfix can exist at a time.`,
        };
      }

      core.info(`🌿 Creating hotfix branch ${hotfixBranch} from tag ${tagName}...`);

      const tagRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `tags/${tagName}`,
      });

      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${hotfixBranch}`,
        sha: tagRef.data.object.sha,
      });

      core.info(`✅ Hotfix branch created successfully: ${hotfixBranch}`);

      return {
        success: true,
        hotfixBranch,
        baseVersion: tagName,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async propagateHotfix(options: PropagateHotfixOptions): Promise<PropagateHotfixResult> {
    const { version, hotfixSuffix, directMergeBranches, updateThenMergeBranches, autoCleanup } =
      options;

    const cleanVersion = version.replace(/^v/, '');
    const hotfixBranch = `hotfix/v${cleanVersion}-${hotfixSuffix}`;

    const successfulBranches: string[] = [];
    const failedBranches: string[] = [];
    const createdPRs: number[] = [];

    try {
      core.info(`🔍 Verifying hotfix branch ${hotfixBranch} exists...`);

      const branchExists = await this.branchExists(hotfixBranch);
      if (!branchExists) {
        return {
          status: 'failed',
          error: `Hotfix branch '${hotfixBranch}' does not exist`,
        };
      }

      core.info('📋 Stage 1: Processing direct merge branches...');

      const directTargets = await this.findTargetBranches(directMergeBranches, version);
      for (const targetBranch of directTargets) {
        const result = await this.createAndMergePR(hotfixBranch, targetBranch, 'merge');
        if (result.success) {
          successfulBranches.push(targetBranch);
          if (result.prNumber) createdPRs.push(result.prNumber);
        } else {
          failedBranches.push(targetBranch);
          core.error(`❌ Failed to propagate to ${targetBranch}: ${result.error}`);
        }
      }

      core.info('🔄 Stage 2: Processing update then merge branches...');

      for (const targetBranch of updateThenMergeBranches.filter(b => b.trim())) {
        const branchExists = await this.branchExists(targetBranch);
        if (!branchExists) {
          core.warning(`⚠️ Branch ${targetBranch} does not exist, skipping...`);
          continue;
        }

        core.info(`🔄 Updating hotfix branch ${hotfixBranch} with ${targetBranch}...`);
        const updateResult = await this.updateBranch(hotfixBranch, targetBranch);

        if (updateResult.success) {
          const result = await this.createAndMergePR(hotfixBranch, targetBranch, 'merge');
          if (result.success) {
            successfulBranches.push(targetBranch);
            if (result.prNumber) createdPRs.push(result.prNumber);
          } else {
            failedBranches.push(targetBranch);
            core.error(`❌ Failed to propagate to ${targetBranch}: ${result.error}`);
          }
        } else {
          failedBranches.push(targetBranch);
          core.error(
            `❌ Failed to update hotfix branch with ${targetBranch}: ${updateResult.error}`
          );
        }
      }

      if (autoCleanup && failedBranches.length === 0) {
        core.info(`🧹 Cleaning up hotfix branch ${hotfixBranch}...`);
        await this.deleteBranch(hotfixBranch);
      }

      const status =
        failedBranches.length === 0
          ? 'success'
          : successfulBranches.length > 0
            ? 'partial'
            : 'failed';

      return {
        status,
        successfulBranches,
        failedBranches,
        createdPRs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed',
        error: errorMessage,
      };
    }
  }

  private async tagExists(tagName: string): Promise<boolean> {
    const { owner, repo } = this.context.repo;

    try {
      await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `tags/${tagName}`,
      });
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  private async branchExists(branchName: string): Promise<boolean> {
    const { owner, repo } = this.context.repo;

    try {
      await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: branchName,
      });
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  private async findExistingHotfixBranches(): Promise<string[]> {
    const { owner, repo } = this.context.repo;

    try {
      const branches = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return branches.data.map(branch => branch.name).filter(name => name.startsWith('hotfix/'));
    } catch (_error) {
      core.warning('Could not fetch branch list for hotfix detection');
      return [];
    }
  }

  private async findTargetBranches(patterns: string[], baseVersion: string): Promise<string[]> {
    const { owner, repo } = this.context.repo;
    const targets: string[] = [];

    try {
      const branches = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      for (const pattern of patterns) {
        const trimmedPattern = pattern.trim();

        if (trimmedPattern === 'main') {
          targets.push('main');
        } else if (trimmedPattern === 'release/*') {
          const releaseBranches = branches.data
            .map(branch => branch.name)
            .filter(name => name.startsWith('release/'));

          for (const releaseBranch of releaseBranches) {
            const branchVersion = extractVersionFromBranch(releaseBranch);
            if (branchVersion && isVersionNewer(baseVersion, branchVersion)) {
              targets.push(releaseBranch);
            }
          }
        }
      }
    } catch (error) {
      core.error(`Failed to fetch target branches: ${error}`);
    }

    return [...new Set(targets)];
  }

  private async createAndMergePR(
    sourceBranch: string,
    targetBranch: string,
    mergeMethod: string
  ): Promise<{ success: boolean; prNumber?: number; error?: string }> {
    const { owner, repo } = this.context.repo;

    try {
      const comparison = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: targetBranch,
        head: sourceBranch,
      });

      if (comparison.data.ahead_by === 0) {
        core.info(`ℹ️ No changes to propagate from ${sourceBranch} to ${targetBranch}`);
        return { success: true };
      }

      const prTitle = `Hotfix: Propagate ${sourceBranch} to ${targetBranch}`;
      const prBody = `
🚨 **Hotfix Propagation**

Automatically propagating hotfix changes from \`${sourceBranch}\` to \`${targetBranch}\`.

**Changes:**
- ${comparison.data.ahead_by} commit(s) ahead
- ${comparison.data.commits.length} commit(s) to be merged

**Merge Method:** ${mergeMethod}

🤖 Generated by Propagate Merger
      `.trim();

      const pr = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: sourceBranch,
        base: targetBranch,
      });

      await this.waitForMergeability(pr.data.number);

      const updatedPr = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pr.data.number,
      });

      if (updatedPr.data.mergeable === false) {
        return {
          success: false,
          prNumber: pr.data.number,
          error: 'PR has merge conflicts',
        };
      }

      await this.octokit.rest.pulls.merge({
        owner,
        repo,
        pull_number: pr.data.number,
        merge_method: mergeMethod as 'merge' | 'squash' | 'rebase',
      });

      core.info(`✅ Successfully merged PR #${pr.data.number}: ${sourceBranch} → ${targetBranch}`);

      return {
        success: true,
        prNumber: pr.data.number,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async updateBranch(
    hotfixBranch: string,
    sourceBranch: string
  ): Promise<{ success: boolean; error?: string }> {
    const { owner, repo } = this.context.repo;

    try {
      const sourceRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`,
      });

      const hotfixRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${hotfixBranch}`,
      });

      const mergeBase = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: hotfixRef.data.object.sha,
        head: sourceRef.data.object.sha,
      });

      if (mergeBase.data.ahead_by === 0) {
        core.info(`ℹ️ ${hotfixBranch} is already up to date with ${sourceBranch}`);
        return { success: true };
      }

      const merge = await this.octokit.rest.repos.merge({
        owner,
        repo,
        base: hotfixBranch,
        head: sourceBranch,
        commit_message: `Update ${hotfixBranch} with latest changes from ${sourceBranch}`,
      });

      if (merge.status === 201) {
        core.info(`✅ Successfully updated ${hotfixBranch} with ${sourceBranch}`);
        return { success: true };
      }
      return {
        success: false,
        error: 'Merge conflicts detected during branch update',
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
        return {
          success: false,
          error: 'Merge conflicts detected during branch update',
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async deleteBranch(branchName: string): Promise<void> {
    const { owner, repo } = this.context.repo;

    try {
      await this.octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      });
      core.info(`🗑️ Deleted branch: ${branchName}`);
    } catch (error) {
      core.warning(`Could not delete branch ${branchName}: ${error}`);
    }
  }

  private async waitForMergeability(prNumber: number, maxAttempts = 10): Promise<void> {
    const { owner, repo } = this.context.repo;

    for (let i = 0; i < maxAttempts; i++) {
      const pr = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      if (pr.data.mergeable !== null) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
