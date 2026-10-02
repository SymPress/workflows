<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$metadata = json_decode(file_get_contents($root . '/.sympress-artifact.json'), true, 512, JSON_THROW_ON_ERROR);
$build = json_decode(file_get_contents(__DIR__ . '/dist/build.json'), true, 512, JSON_THROW_ON_ERROR);
if ($metadata['commit'] !== getenv('GITHUB_SHA') || $metadata['kind'] !== 'release'
    || $build['commit'] !== $metadata['commit']) {
    throw new RuntimeException('Deployment artifact does not match the build commit.');
}
foreach (['.env.probe', 'auth.json', '.npmrc'] as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        throw new RuntimeException('Private file reached the deployment artifact.');
    }
}
file_put_contents(sys_get_temp_dir() . '/sympress-deploy-fixture-' . getmypid(), $build['commit']);
echo "Artifact verified and local deployment completed.\n";
