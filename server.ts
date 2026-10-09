import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const distFile = path.join(process.cwd(), 'dist', 'server.cjs');

// In production or when the bundle exists, load the bundled server directly
if (process.env.NODE_ENV === 'production' || existsSync(distFile)) {
  try {
    await import(pathToFileURL(distFile).href);
  } catch (err) {
    console.error('Dynamic import of bundled server failed, spawning node process instead:', err);
    const child = spawn(process.execPath, [distFile], { stdio: 'inherit', env: process.env });
    child.on('exit', (code) => process.exit(code ?? 0));
  }
} else {
  // In development mode, invoke tsx on src/server/index.ts
  const serverPath = path.join(process.cwd(), 'src', 'server', 'index.ts');
  const child = spawn(process.execPath, ['--import', 'tsx', serverPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}
