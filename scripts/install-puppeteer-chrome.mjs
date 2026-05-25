import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const installScript = 'node_modules/puppeteer/install.mjs';

if (existsSync(installScript)) {
  execSync(`node ${installScript}`, { stdio: 'inherit' });
}
