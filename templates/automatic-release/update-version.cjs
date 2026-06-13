const fs = require('node:fs');
const path = require('node:path');

const version = process.argv[2];

if (!version) {
  throw new Error('Missing release version argument.');
}

function updateJson(file) {
  if (!fs.existsSync(file)) {
    return;
  }

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.version = version;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function updateHeader(file) {
  if (!fs.existsSync(file)) {
    return;
  }

  let contents = fs.readFileSync(file, 'utf8');
  contents = contents.replace(
    /^([ \t]*(?:\*[ \t]*)?Version:[ \t]*).*/m,
    `$1${version}`
  );
  fs.writeFileSync(file, contents);
}

function findPluginMainFile() {
  const phpFiles = fs.readdirSync(process.cwd())
    .filter((file) => file.endsWith('.php') && fs.statSync(file).isFile());

  return phpFiles.find((file) => fs.readFileSync(file, 'utf8').includes('Plugin Name:'));
}

updateJson('composer.json');
updateJson('package.json');
updateJson('package-lock.json');

if (fs.existsSync('style.css') && fs.readFileSync('style.css', 'utf8').includes('Theme Name:')) {
  updateHeader('style.css');
}

const pluginMain = findPluginMainFile();

if (pluginMain) {
  updateHeader(path.basename(pluginMain));
}

