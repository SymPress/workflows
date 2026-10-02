<?php

declare(strict_types=1);

namespace Sympress\Fixture\Monorepo\Tests;

use PHPUnit\Framework\TestCase;
use Sympress\Fixture\Monorepo\Example;

final class ExampleTest extends TestCase
{
    public function testAnswer(): void
    {
        self::assertSame(42, (new Example())->answer());
    }
}
