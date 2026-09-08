import { access, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const channel = process.env.BUILD_CHANNEL || 'local';
if (!['local', 'ci', 'dev', 'release'].includes(channel)) {
  throw new Error(`Unsupported build channel: ${channel}`);
}

// Refuse to turn a missing build into a directory containing only metadata.
await access(new URL('index.html', dist));
const commit = process.env.GITHUB_SHA || 'local';
const runId = process.env.GITHUB_RUN_ID || '';
const repository = process.env.GITHUB_REPOSITORY || '';
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
const metadata = {
  channel,
  commit,
  shortCommit: commit.slice(0, 7),
  ref: process.env.GITHUB_REF || 'local',
  builtAt: new Date().toISOString(),
  runId,
  runUrl: repository && runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : '',
  workflow: process.env.GITHUB_WORKFLOW || 'local',
  demo: true,
};

await writeFile(new URL('build-info.json', dist), `${JSON.stringify(metadata, null, 2)}\n`);
await writeFile(new URL('.nojekyll', dist), '');
console.log(`Stamped ${channel} build (${metadata.shortCommit}).`);
