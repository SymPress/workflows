<?php

declare(strict_types=1);

$root = getenv('SYMPRESS_RELEASE_DIRECTORY');
if (!is_string($root) || realpath($root) !== $root || !is_dir($root)) {
    throw new RuntimeException('Separate release payload directory required.');
}
$payload = $root . '/fixtures/deployer';
$metadata = json_decode(file_get_contents($root . '/.sympress-artifact.json'), true, 512, JSON_THROW_ON_ERROR);
$build = json_decode(file_get_contents($payload . '/dist/build.json'), true, 512, JSON_THROW_ON_ERROR);
if ($metadata['commit'] !== getenv('GITHUB_SHA') || $metadata['kind'] !== 'release'
    || $build['commit'] !== $metadata['commit']) {
    throw new RuntimeException('Deployment artifact does not match the build commit.');
}
foreach (['.env.probe', 'auth.json', '.npmrc'] as $file) {
    if (file_exists($payload . '/' . $file)) {
        throw new RuntimeException('Private file reached the deployment artifact.');
    }
}
foreach (['deploy.php', 'verify.php', 'vendor/bin/dep', 'vendor/deployer/deployer/bin/dep'] as $file) {
    if (!str_contains(file_get_contents($payload . '/' . $file), 'Build-controlled deployment code executed')) {
        throw new RuntimeException('Deployment tool tamper fixture was not built.');
    }
}
file_put_contents(sys_get_temp_dir() . '/sympress-deploy-fixture-' . getmypid(), $build['commit']);
echo "Artifact verified and local deployment completed.\n";
