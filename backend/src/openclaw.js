import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getOpenClawStatus() {
  const { stdout } = await execFileAsync('openclaw', ['status', '--json'], {
    timeout: 12000,
    maxBuffer: 1024 * 1024 * 4
  });
  return JSON.parse(stdout);
}
