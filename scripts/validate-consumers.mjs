import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const interfaces = JSON.parse(readFileSync(path.join(root, 'workflow-interfaces.json'), 'utf8'));
const byFile = new Map(interfaces.workflows.map((workflow) => [workflow.file, workflow]));
const consumerRoots = process.argv.slice(2);

if (consumerRoots.length === 0) {
  throw new Error('Pass at least one consumer repository path.');
}

let calls = 0;

for (const consumerRoot of consumerRoots) {
  const workflowDir = path.join(consumerRoot, '.github', 'workflows');
  if (!existsSync(workflowDir)) {
    throw new Error(`${consumerRoot} has no .github/workflows directory`);
  }

  for (const entry of readdirSync(workflowDir)) {
    if (!/\.ya?ml$/.test(entry)) {
      continue;
    }

    const file = path.join(workflowDir, entry);
    const document = parseDocument(readFileSync(file, 'utf8'), { prettyErrors: true });
    if (document.errors.length > 0) {
      throw new Error(`${file}: ${document.errors.join('\n')}`);
    }

    for (const [jobName, job] of Object.entries(document.toJS()?.jobs ?? {})) {
      if (typeof job?.uses !== 'string') {
        continue;
      }

      const match = job.uses.match(/^sympress\/workflows\/(\.github\/workflows\/[^@]+)@(.+)$/i);
      if (!match) {
        continue;
      }

      calls++;
      const [, workflowFile, ref] = match;
      const contract = byFile.get(workflowFile);
      if (!contract) {
        throw new Error(`${file} job ${jobName} calls unknown workflow ${workflowFile}`);
      }
      if (ref === 'main') {
        throw new Error(`${file} job ${jobName} must not call the floating main ref`);
      }

      const providedInputs = job.with && typeof job.with === 'object' ? job.with : {};
      for (const input of Object.keys(providedInputs)) {
        if (!(input in contract.inputs)) {
          throw new Error(`${file} job ${jobName} passes unknown input ${input}`);
        }
      }
      for (const [input, definition] of Object.entries(contract.inputs)) {
        if (definition.required === true && !('default' in definition) && !(input in providedInputs)) {
          throw new Error(`${file} job ${jobName} is missing required input ${input}`);
        }
      }

      if (job.secrets === 'inherit') {
        continue;
      }

      const providedSecrets = job.secrets && typeof job.secrets === 'object' ? job.secrets : {};
      for (const secret of Object.keys(providedSecrets)) {
        if (!(secret in contract.secrets)) {
          throw new Error(`${file} job ${jobName} passes unknown secret ${secret}`);
        }
      }
      for (const [secret, definition] of Object.entries(contract.secrets)) {
        if (definition.required === true && !(secret in providedSecrets)) {
          throw new Error(`${file} job ${jobName} is missing required secret ${secret}`);
        }
      }
    }
  }
}

if (calls === 0) {
  throw new Error('No SymPress workflow calls found in the supplied consumers.');
}

console.log(`Validated ${calls} SymPress workflow call${calls === 1 ? '' : 's'}.`);
