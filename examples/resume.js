/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-console */

/**
 * Example demonstrating resume functionality for listing dependents
 *
 * This example shows how to:
 * 1. Use onProgress callback to track progress
 * 2. Save progress to a file incrementally
 * 3. Resume from a partial list using skipList
 */

import { createLogger } from 'bunyan-adaptor';
import { writeFile, readFile } from 'node:fs/promises';
import { fetchEcosystemDependents } from '../index.js';

const name = process.argv[2];
const resumeFrom = process.argv[3]; // Optional: path to partial results file

if (!name) {
  console.error('Usage: node examples/resume.js <package-name> [resume-from-file]');
  console.error('Example: node examples/resume.js mocha');
  console.error('Example: node examples/resume.js mocha ./partial-results.ndjson');
  process.exit(1);
}

const outputFile = `${name}-dependents.ndjson`;
/** @type {Set<string>} */
let skipList = new Set();
let processedCount = 0;

// Load existing results if resuming
if (resumeFrom) {
  try {
    const content = await readFile(resumeFrom, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        /** @type {{ name: string }} */
        const item = JSON.parse(line);
        skipList.add(item.name);
      } catch {
        // Skip invalid lines
      }
    }

    processedCount = skipList.size;
    console.log(`Resuming from ${resumeFrom} with ${processedCount} packages already processed`);
  } catch (err) {
    console.error(`Could not read resume file: ${/** @type {Error} */ (err).message}`);
    console.log('Starting fresh...');
    skipList = new Set();
  }
}

/** @type {import('../index.js').EcosystemDependentsOptions} */
const options = {
  logger: createLogger(),
  maxPages: 3, // Limit for demo purposes
  minDownloadsLastMonth: 100,
  onProgress: (progress) => {
    // Log progress updates
    console.log(`Page ${progress.page} | Processed: ${progress.itemsProcessed} | Current: ${progress.currentPackage}`);
  },
  skipList,
};

console.log(`Fetching dependents for "${name}"...`);

const result = fetchEcosystemDependents(name, options);

for await (const item of result) {
  // Write each item to file as we get it (incremental saving)
  const line = JSON.stringify({
    downloads: item.downloads,
    name: item.name,
    targetVersion: item.targetVersion,
    description: item.pkg?.description,
  }) + '\n';

  await writeFile(outputFile, line, { flag: 'a' });
  processedCount++;
}

console.log(`\nCompleted! Total packages: ${processedCount}`);
console.log(`Results saved to: ${outputFile}`);
