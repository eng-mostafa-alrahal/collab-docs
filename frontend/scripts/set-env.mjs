import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetPath = resolve(__dirname, '../src/environments/environment.prod.ts');

const rawApiUrl = (process.env.API_URL || '').trim().replace(/\/+$/, '');
const apiUrl = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
};
`;

writeFileSync(targetPath, content, 'utf-8');
console.log(`Configured environment.prod.ts apiUrl = ${apiUrl}`);

