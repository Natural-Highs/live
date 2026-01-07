# Changelog

## [0.0.2](https://github.com/Natural-Highs/live/compare/v0.0.1...v0.0.2) (2026-01-07)


### Features

* emulator-first test infrastructure and admin guest email ([#89](https://github.com/Natural-Highs/live/issues/89)) ([312575a](https://github.com/Natural-Highs/live/commit/312575aab8dfe61f267c25124bc53ec63ff5ad5d))
* **guest:** guest-to-user conversion ([#88](https://github.com/Natural-Highs/live/issues/88)) ([64f850e](https://github.com/Natural-Highs/live/commit/64f850e9eee42dbf53996785fbf5f9b7c6c6cfa3))
* **profile:** attendance history and account activity ([#91](https://github.com/Natural-Highs/live/issues/91)) ([4d8d128](https://github.com/Natural-Highs/live/commit/4d8d1283d9e4bb7d7278c9d8c10f9db85f0dcdf4))


### Bug Fixes

* **ci:** resolve trunk check and codecov failures ([1b09e78](https://github.com/Natural-Highs/live/commit/1b09e782f01250562e4400d744363d10ab020fd2))
* correct netlify build output ([ebdfe65](https://github.com/Natural-Highs/live/commit/ebdfe65d4c8b4587a5a0f12292eb97ee378d38d7))
* **deps:** regenerate corrupted bun.lock ([e83fa04](https://github.com/Natural-Highs/live/commit/e83fa0411cc9ec6b775c75269d38df7c3052136b))
* **test:** mock isEmulatorMode in session middleware tests ([db8aec5](https://github.com/Natural-Highs/live/commit/db8aec5ea27db3cb3046c0877f5ddfca7b9ccacd))


### Refactoring

* **server:** migrate to server functions, remove REST mocks ([#99](https://github.com/Natural-Highs/live/issues/99)) ([b75d8f2](https://github.com/Natural-Highs/live/commit/b75d8f2efb7bf07243a5ef6d6f0a4abf1c7faaa3))


### Documentation

* clean up changelog footer ([1941697](https://github.com/Natural-Highs/live/commit/194169764a16b8aef5e278e97d874f025cda4803))


### Tests

* **e2e:** update specs for emulator-backed testing ([#97](https://github.com/Natural-Highs/live/issues/97)) ([13217c9](https://github.com/Natural-Highs/live/commit/13217c9d2cf7f1f6fa148ebdc333c58c48bd06fe))
* **fixtures:** worker isolation, retry logic, emulator health ([#95](https://github.com/Natural-Highs/live/issues/95)) ([a05bbe6](https://github.com/Natural-Highs/live/commit/a05bbe6e1e5616dd4aede029f1b8de31009d6265))
* **session:** add emulator mode branch coverage ([8cf70e8](https://github.com/Natural-Highs/live/commit/8cf70e8d043e358cd5962b2e63b6da5a0f209f90))
* **session:** add SSR and async function tests for grace-period ([82310c8](https://github.com/Natural-Highs/live/commit/82310c82fa95ff4a35219f670f5ecbf2afd83578))


### CI

* optimize pipeline with path-based filtering ([#45](https://github.com/Natural-Highs/live/issues/45)) ([415c58e](https://github.com/Natural-Highs/live/commit/415c58e7d8b442e6442b7be15bbc0f75e365cf2a))

## [0.0.1](https://github.com/Natural-Highs/live/compare/v0.0.0...v0.0.1) (2025-12-30)


### Features

* **auth:** extended session management with revocation and grace period ([#28](https://github.com/Natural-Highs/live/issues/28)) ([f3b93c4](https://github.com/Natural-Highs/live/commit/f3b93c455909c73817b3626339f2037c4b89cd6a))
* **auth:** passwordless magic link authentication ([#26](https://github.com/Natural-Highs/live/issues/26)) ([f78f333](https://github.com/Natural-Highs/live/commit/f78f3334b42b0c4e0f04f774e775bc65bb2bd661))
* **auth:** WebAuthn passkey registration and authentication ([#27](https://github.com/Natural-Highs/live/issues/27)) ([03b1840](https://github.com/Natural-Highs/live/commit/03b1840e06aab057eee757b59de8dcdd6b7bb22c))
* **check-in:** QR code scanner alternative ([#33](https://github.com/Natural-Highs/live/issues/33)) ([a95646a](https://github.com/Natural-Highs/live/commit/a95646a2fbcd876d9401978a6759b71a89e1a569))
* **check-in:** success confirmation with time window validation ([#32](https://github.com/Natural-Highs/live/issues/32)) ([be88137](https://github.com/Natural-Highs/live/commit/be881377068bb8ad9495d19f59dae9bd8eefc318))
* **ci:** initial automated CI/CD pipeline ([#20](https://github.com/Natural-Highs/live/issues/20)) ([cd0819a](https://github.com/Natural-Highs/live/commit/cd0819ac4a5053603c7f758928d8457c72a0231d))
* **guest:** guest check-in flow ([#34](https://github.com/Natural-Highs/live/issues/34)) ([6f2daa8](https://github.com/Natural-Highs/live/commit/6f2daa862360ba6643bdfa54fca396c418f2a8d7))
* **profile:** minimal profile creation flow ([#29](https://github.com/Natural-Highs/live/issues/29)) ([c7e7bb6](https://github.com/Natural-Highs/live/commit/c7e7bb685490e3bf54a4baeb01f37269d6be9af8))
* **settings:** profile settings page with history tracking ([#30](https://github.com/Natural-Highs/live/issues/30)) ([7a20e4b](https://github.com/Natural-Highs/live/commit/7a20e4ba51c4f55b1b40cf29b8e1b72a9a326cf2))
* TanStack Start architecture and ecosystem ([#19](https://github.com/Natural-Highs/live/issues/19)) ([2a1097a](https://github.com/Natural-Highs/live/commit/2a1097ad5e371c30681efedcef0b958c58578463))
* **tests:** E2E test infra and session auth ([#24](https://github.com/Natural-Highs/live/issues/24)) ([86d9aa0](https://github.com/Natural-Highs/live/commit/86d9aa0b1119806b9c6d1f22384e67923c83416d))
* **tests:** standardize test architecture with fixture composition ([#31](https://github.com/Natural-Highs/live/issues/31)) ([c1fd0dd](https://github.com/Natural-Highs/live/commit/c1fd0dd462894bafe8c69a525633538092260349))
* **ui:** migrate to shadcn/ui design system ([#22](https://github.com/Natural-Highs/live/issues/22)) ([9fa6731](https://github.com/Natural-Highs/live/commit/9fa67312c6aca03413642a74719471642ab3b492))


### Bug Fixes

* complete session fixture for E2E tests ([#39](https://github.com/Natural-Highs/live/issues/39)) ([d619d5b](https://github.com/Natural-Highs/live/commit/d619d5b5dbcaa84d727aac370f4e84b54b91ad16))
* resolve unresolved conflict markers ([#37](https://github.com/Natural-Highs/live/issues/37)) ([d09e601](https://github.com/Natural-Highs/live/commit/d09e60195fa426e9ae0cd4c3fe7821df2c2a67b2))
* sync tests from 3-1 completion ([#38](https://github.com/Natural-Highs/live/issues/38)) ([e3483c2](https://github.com/Natural-Highs/live/commit/e3483c2dae2375dd73677ce148ade57f9b932226))


### Refactoring

* **build:** consolidate project structure ([#36](https://github.com/Natural-Highs/live/issues/36)) ([33c7af8](https://github.com/Natural-Highs/live/commit/33c7af8bda6aabc29d0220cc1e52b8d7d34bb0db))


### Documentation

* add logo assets and update README ([#40](https://github.com/Natural-Highs/live/issues/40)) ([e6f6d87](https://github.com/Natural-Highs/live/commit/e6f6d87c1a5858cbe5a127e957c2486d83056f99))


### Tests

* add layer test coverage for all architecture layers ([#23](https://github.com/Natural-Highs/live/issues/23)) ([2aec493](https://github.com/Natural-Highs/live/commit/2aec4930e51a21d1d0ceb744f2c4029368e5ac96))
