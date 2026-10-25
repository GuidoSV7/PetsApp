import type { TestProject } from 'vitest/node';
import { readTestUrl, startTestRun } from './postgres-lifecycle.js';

/** Vitest calls this before workers and the returned teardown after the entire run. */
export default async function setup(project: TestProject) {
  if (!process.env.TEST_DATABASE_URL?.trim()) return;
  const run = await startTestRun(readTestUrl());
  try {
    project.provide('postgresTestRun', run.context);
  } catch (error) {
    await run.close();
    throw error;
  }
  return run.close;
}
