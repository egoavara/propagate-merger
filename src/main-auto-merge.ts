import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';
import { HotfixManager } from './hotfix-manager';

export async function runAutoMerge(): Promise<void> {
  const version = core.getInput('version', { required: true });
  const hotfixSuffix = core.getInput('hotfix-suffix') || 'hotfix.1';
  const githubToken = core.getInput('github-token', { required: true });
  const directMergeBranches = core.getInput('direct-merge-branches') || 'main,release/*';
  const updateThenMergeBranches = core.getInput('update-then-merge-branches') || 'dev';
  const autoCleanup = core.getInput('auto-cleanup') === 'true';

  const octokit = new Octokit({
    auth: githubToken,
  });
  const context = github.context;
  const hotfixManager = new HotfixManager(octokit, context);

  const hotfixBranch = `hotfix/v${version.replace(/^v/, '')}-${hotfixSuffix}`;

  core.info(`🔄 Starting hotfix propagation for: ${hotfixBranch}`);
  core.info(`📦 Version: ${version}`);
  core.info(`🔖 Hotfix suffix: ${hotfixSuffix}`);
  core.info(`📋 Direct merge branches: ${directMergeBranches}`);
  core.info(`🔄 Update then merge branches: ${updateThenMergeBranches}`);
  core.info(`🧹 Auto cleanup: ${autoCleanup}`);

  const result = await hotfixManager.propagateHotfix({
    version,
    hotfixSuffix,
    directMergeBranches: directMergeBranches.split(',').map(b => b.trim()),
    updateThenMergeBranches: updateThenMergeBranches.split(',').map(b => b.trim()),
    autoCleanup,
  });

  core.setOutput('hotfix-branch', hotfixBranch);
  core.setOutput('propagation-result', result.status);
  core.setOutput('successful-branches', JSON.stringify(result.successfulBranches || []));
  core.setOutput('failed-branches', JSON.stringify(result.failedBranches || []));
  core.setOutput('created-prs', JSON.stringify(result.createdPRs || []));

  core.info('📊 Propagation Results:');
  core.info(`   Status: ${result.status}`);
  core.info(`   Successful branches: ${result.successfulBranches?.length || 0}`);
  core.info(`   Failed branches: ${result.failedBranches?.length || 0}`);
  core.info(`   Created PRs: ${result.createdPRs?.length || 0}`);

  if (result.successfulBranches && result.successfulBranches.length > 0) {
    core.info(`✅ Successfully propagated to: ${result.successfulBranches.join(', ')}`);
  }

  if (result.failedBranches && result.failedBranches.length > 0) {
    core.warning(`⚠️ Failed to propagate to: ${result.failedBranches.join(', ')}`);
  }

  if (result.createdPRs && result.createdPRs.length > 0) {
    core.info(`🔗 Created PRs: #${result.createdPRs.join(', #')}`);
  }

  if (result.status === 'success') {
    core.info('✅ Hotfix propagation completed successfully');
  } else if (result.status === 'partial') {
    core.warning(
      '⚠️ Hotfix propagation completed with some failures - manual intervention may be required'
    );
  } else {
    core.setFailed(`❌ Hotfix propagation failed: ${result.error}`);
    throw new Error(result.error);
  }
}
