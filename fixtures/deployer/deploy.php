<?php

declare(strict_types=1);

namespace Deployer;

require 'recipe/common.php';

localhost('fixture');
task('deploy', static function (): void {
    run('cd ' . escapeshellarg(__DIR__) . ' && php verify.php');
});
