import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const dir = path.dirname(import.meta.url.replace('file://', ''));

const files = fs.readdirSync(dir).filter(f => /^emails_\d+\.json$/.test(f)).sort();

const emails = files.flatMap(f => require('./' + f));

export default emails; 