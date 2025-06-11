import * as core from '@actions/core';
import * as github from '@actions/github';
import { HotfixManager } from './hotfix-manager';

export async function runBranchCreate(): Promise<void> {
  const version = core.getInput('version', { required: true });
  const hotfixSuffix = core.getInput('hotfix-suffix') || 'hotfix.1';
  const githubToken = core.getInput('github-token', { required: true });

  core.info(`🌿 Creating hotfix branch for version: ${version}`);
  core.info(`🔖 Hotfix suffix: ${hotfixSuffix}`);

  const octokit = github.getOctokit(githubToken);
  const context = github.context;
  const hotfixManager = new HotfixManager(octokit, context);

  const hotfixBranch = `hotfix/v${version.replace(/^v/, '')}-${hotfixSuffix}`;
  core.info(`🌿 Target hotfix branch: ${hotfixBranch}`);

  const result = await hotfixManager.createHotfixBranch(version, hotfixSuffix);

  core.setOutput('hotfix-branch', result.hotfixBranch || '');
  core.setOutput('base-version', result.baseVersion || '');

  if (result.success) {
    core.info(`✅ Hotfix branch created successfully: ${result.hotfixBranch}`);
    core.info(`📍 Base version: ${result.baseVersion}`);
  } else {
    core.setFailed(`❌ Failed to create hotfix branch: ${result.error}`);
    throw new Error(result.error);
  }
}
