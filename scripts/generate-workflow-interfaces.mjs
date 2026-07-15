import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = path.join(root, 'workflow-interfaces.json');
const catalog = JSON.parse(readFileSync(path.join(root, 'workflow-catalog.json'), 'utf8'));

const workflows = catalog.workflows.flatMap(({ id, file }) => {
  const document = parseDocument(readFileSync(path.join(root, file), 'utf8'), { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new Error(`${file}: ${document.errors.join('\n')}`);
  }

  const call = document.toJS()?.on?.workflow_call;
  if (!call || typeof call !== 'object') {
    return [];
  }

  return [{
    id,
    file,
    inputs: call.inputs ?? {},
    secrets: call.secrets ?? {},
    outputs: call.outputs ?? {},
  }];
});

const generated = `${JSON.stringify({ repository: catalog.repository, workflows }, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const committed = readFileSync(outputFile, 'utf8');
  if (committed !== generated) {
    throw new Error('workflow-interfaces.json is stale; run npm run generate:interfaces');
  }
} else {
  writeFileSync(outputFile, generated);
}
