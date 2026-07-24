# @fixture-gen/playwright

## 0.1.0

### Minor Changes

- Initial release of @fixture-gen/playwright on npm.
  - `fixtureFactory(schema, options?)` — Playwright fixture for `test.extend` (one value per test)
  - `factoryFixture(schema, options?)` — injects a callable factory for multiple values / overrides
  - `createFactory(schema, options?)` — standalone seed-counter factory
  - `isolateWorkers` option for deterministic per-worker seed isolation
