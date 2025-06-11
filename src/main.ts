import * as core from '@actions/core';
import { runAutoMerge } from './main-auto-merge';
import { runBranchCreate } from './main-branch-create';

async function run(): Promise<void> {
  try {
    const mode = core.getInput('mode', { required: true });

    core.info(`🚀 Starting Propagate Merger in mode: ${mode}`);

    if (mode === 'branch-create') {
      await runBranchCreate();
    } else if (mode === 'auto-merge') {
      await runAutoMerge();
    } else {
      core.setFailed(`❌ Invalid mode: ${mode}. Must be 'branch-create' or 'auto-merge'`);
      return;
    }

    core.info(`✅ Propagate Merger completed successfully in mode: ${mode}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`❌ Action failed: ${errorMessage}`);
  }
}

run();
