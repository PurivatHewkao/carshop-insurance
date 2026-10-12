import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const directories = [
  '.',
  'apps/web',
  'services/identity',
  'services/catalog',
  'services/sales',
  'services/payment',
  'services/reporting',
];
for (const directory of directories) {
  console.log('Installing: ' + directory);
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, 'install'],
    {
      cwd: new URL(directory + '/', new URL('../', import.meta.url)),
      stdio: 'inherit',
    },
  );
  if (result.error || result.status !== 0) {
    console.error(
      result.error?.message ||
        'Installation failed at ' + directory + ' in ' + root,
    );
    process.exit(result.status || 1);
  }
}
