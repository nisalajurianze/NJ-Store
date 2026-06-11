const { spawnSync } = require('node:child_process');

const [scriptName, ...workspaceNames] = process.argv.slice(2);
const npmExecPath = process.env.npm_execpath;

if (!scriptName || workspaceNames.length === 0 || !npmExecPath) {
  console.error('Usage: node scripts/run-workspace-script.cjs <script> <workspace...>');
  process.exit(1);
}

const failures = [];

for (const workspaceName of workspaceNames) {
  const result = spawnSync(
    process.execPath,
    [npmExecPath, 'run', '--workspace', workspaceName, scriptName],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false
    }
  );

  if (result.status !== 0) {
    failures.push(workspaceName);
  }
}

if (failures.length > 0) {
  console.error(`Workspace script "${scriptName}" failed for: ${failures.join(', ')}`);
  process.exit(1);
}
