import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

function extractFirstJson(text = '') {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

export async function getOpenClawStatus() {
  try {
    const { stdout } = await execFileAsync('openclaw', ['status', '--json'], {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 8
    });
    return JSON.parse(stdout);
  } catch (e) {
    // Fallback: tolerate non-zero exit if JSON is still printed
    const { stdout } = await execAsync('openclaw status --json || true', {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 8,
      shell: '/bin/bash'
    });
    const raw = extractFirstJson(stdout || '');
    return JSON.parse(raw);
  }
}
