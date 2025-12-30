# Changelog

## [0.0.2](https://github.com/Natural-Highs/live/compare/v0.0.1...v0.0.2) (2025-12-30)


### Features

* add inital dev container config ([299edea](https://github.com/Natural-Highs/live/commit/299edea86f0da2227ad3bb3740afd5bc05babb8c))
* add scripts for dev environment ([a0a69e9](https://github.com/Natural-Highs/live/commit/a0a69e9a9a73d2fe27a4f10e9677f322bf1841b1))
* analytics page UI and dummy functionality ([#97](https://github.com/Natural-Highs/live/issues/97)) ([d9c975c](https://github.com/Natural-Highs/live/commit/d9c975c1bed2891784e1648bd47b5882eeccd057))
* **auth:** extended session management with revocation and grace period ([#28](https://github.com/Natural-Highs/live/issues/28)) ([f3b93c4](https://github.com/Natural-Highs/live/commit/f3b93c455909c73817b3626339f2037c4b89cd6a))
* **auth:** passwordless magic link authentication ([#26](https://github.com/Natural-Highs/live/issues/26)) ([f78f333](https://github.com/Natural-Highs/live/commit/f78f3334b42b0c4e0f04f774e775bc65bb2bd661))
* **auth:** WebAuthn passkey registration and authentication ([#27](https://github.com/Natural-Highs/live/issues/27)) ([03b1840](https://github.com/Natural-Highs/live/commit/03b1840e06aab057eee757b59de8dcdd6b7bb22c))
* **backend:** add type definitions for API requests/responses ([becd758](https://github.com/Natural-Highs/live/commit/becd7586da82c09ad3b885cd131e3f7244c05e45))
* **backend:** implement event management and guest registration routes ([dd2156a](https://github.com/Natural-Highs/live/commit/dd2156aa6754e0a277100e4d7d240376ba8631c3))
* **check-in:** QR code scanner alternative ([#33](https://github.com/Natural-Highs/live/issues/33)) ([a95646a](https://github.com/Natural-Highs/live/commit/a95646a2fbcd876d9401978a6759b71a89e1a569))
* **check-in:** success confirmation with time window validation ([#32](https://github.com/Natural-Highs/live/issues/32)) ([be88137](https://github.com/Natural-Highs/live/commit/be881377068bb8ad9495d19f59dae9bd8eefc318))
* **ci:** initial automated CI/CD pipeline ([#20](https://github.com/Natural-Highs/live/issues/20)) ([cd0819a](https://github.com/Natural-Highs/live/commit/cd0819ac4a5053603c7f758928d8457c72a0231d))
* **frontend:** add basic reusable page components with DaisyUI ([1dd08de](https://github.com/Natural-Highs/live/commit/1dd08debeaa041381b17329b28b8d869e47917ba))
* **frontend:** add route protection components ([5b131c6](https://github.com/Natural-Highs/live/commit/5b131c64371e208c68d654b0fe04992a829bb722))
* **guest:** guest check-in flow ([#34](https://github.com/Natural-Highs/live/issues/34)) ([6f2daa8](https://github.com/Natural-Highs/live/commit/6f2daa862360ba6643bdfa54fca396c418f2a8d7))
* implement registration and login endpoints ([#62](https://github.com/Natural-Highs/live/issues/62), [#63](https://github.com/Natural-Highs/live/issues/63)) ([a796416](https://github.com/Natural-Highs/live/commit/a7964162878014776a5f2153bdeb1417de274f1d))
* init React with Vite and Hono ([aa1cdff](https://github.com/Natural-Highs/live/commit/aa1cdff7ab269376f4643db7f53862cb4645242e))
* integrate Doppler for secrets management ([60765a4](https://github.com/Natural-Highs/live/commit/60765a4cce10eff570c1c9cc959f334336ec5bd8))
* **profile:** minimal profile creation flow ([#29](https://github.com/Natural-Highs/live/issues/29)) ([c7e7bb6](https://github.com/Natural-Highs/live/commit/c7e7bb685490e3bf54a4baeb01f37269d6be9af8))
* **settings:** profile settings page with history tracking ([#30](https://github.com/Natural-Highs/live/issues/30)) ([7a20e4b](https://github.com/Natural-Highs/live/commit/7a20e4ba51c4f55b1b40cf29b8e1b72a9a326cf2))
* TanStack Start architecture and ecosystem ([#19](https://github.com/Natural-Highs/live/issues/19)) ([2a1097a](https://github.com/Natural-Highs/live/commit/2a1097ad5e371c30681efedcef0b958c58578463))
* **test:** add integration and E2E testing structure with Playwright ([871b265](https://github.com/Natural-Highs/live/commit/871b2659c612fc67342d6001acc63f589680c58e))
* **test:** add unit testing structure with Vitest ([9d9605a](https://github.com/Natural-Highs/live/commit/9d9605ad063706319dc1fa0d2d763855e1a4e80b))
* **tests:** E2E test infra and session auth ([#24](https://github.com/Natural-Highs/live/issues/24)) ([86d9aa0](https://github.com/Natural-Highs/live/commit/86d9aa0b1119806b9c6d1f22384e67923c83416d))
* **tests:** standardize test architecture with fixture composition ([#31](https://github.com/Natural-Highs/live/issues/31)) ([c1fd0dd](https://github.com/Natural-Highs/live/commit/c1fd0dd462894bafe8c69a525633538092260349))
* **ui:** migrate to shadcn/ui design system ([#22](https://github.com/Natural-Highs/live/issues/22)) ([9fa6731](https://github.com/Natural-Highs/live/commit/9fa67312c6aca03413642a74719471642ab3b492))


### Bug Fixes

* complete session fixture for E2E tests ([#39](https://github.com/Natural-Highs/live/issues/39)) ([d619d5b](https://github.com/Natural-Highs/live/commit/d619d5b5dbcaa84d727aac370f4e84b54b91ad16))
* duplicated AuthPage imports ([6944ba4](https://github.com/Natural-Highs/live/commit/6944ba47a1583ccc3f2cd93d06aec4e5e3060afd))
* firebase env vars and leftover svelte file ([fc4703d](https://github.com/Natural-Highs/live/commit/fc4703d2fa85867e83147f8cdd489deb7f837b31))
* firebase serviceaccount credentials ([94a34ee](https://github.com/Natural-Highs/live/commit/94a34eeaf85eb0c0efbf8f61402fd100777b5b80))
* firebase serviceaccount credentials and environment variables ([620658f](https://github.com/Natural-Highs/live/commit/620658f37d2e65ec912fa9955f4e9419f9b29092))
* logo font not displaying correctly ([d410061](https://github.com/Natural-Highs/live/commit/d410061f40b635ecd9ec185b5f3743d000201331))
* resolve TypeScript errors in Hono backend routes ([aa6950f](https://github.com/Natural-Highs/live/commit/aa6950fa5eef7a03ba1f4d65cdc6569f743d0db9))
* resolve unresolved conflict markers ([#37](https://github.com/Natural-Highs/live/issues/37)) ([d09e601](https://github.com/Natural-Highs/live/commit/d09e60195fa426e9ae0cd4c3fe7821df2c2a67b2))
* sync tests from 3-1 completion ([#38](https://github.com/Natural-Highs/live/issues/38)) ([e3483c2](https://github.com/Natural-Highs/live/commit/e3483c2dae2375dd73677ce148ade57f9b932226))
* workflow trigger on commits to docs/diagrams/** only ([053214e](https://github.com/Natural-Highs/live/commit/053214e296ced411ed16fd2befa9a342e1f5136b))
* workflow trigger on commits to docs/diagrams/** only ([4041dce](https://github.com/Natural-Highs/live/commit/4041dcebbb34499671a7b20bc75e3abe9363e3dc)), closes [#51](https://github.com/Natural-Highs/live/issues/51)


### Refactoring

* **backend:** improve type safety and migrate to signedConsentForm ([3e0a86f](https://github.com/Natural-Highs/live/commit/3e0a86f19cda2a8f334c5935bef481d962b4ba60))
* **backend:** update Firebase configuration and admin setup ([80beffb](https://github.com/Natural-Highs/live/commit/80beffb70161970383c2a8abf33a241c6456b4d0))
* **backend:** update server config and middleware for consent form ([1dfcc1f](https://github.com/Natural-Highs/live/commit/1dfcc1ff2f1dc30dd82656cc3130855bf8c34ea0))
* **build:** consolidate project structure ([#36](https://github.com/Natural-Highs/live/issues/36)) ([33c7af8](https://github.com/Natural-Highs/live/commit/33c7af8bda6aabc29d0220cc1e52b8d7d34bb0db))
* **docs:** update docs/diagrams workflow for migration ([20c6325](https://github.com/Natural-Highs/live/commit/20c63257c2655e3bd624f8370d56775e16284c6f))
* **frontend:** migrate UI to DaisyUI 5 and Tailwind CSS 4 ([eb688f7](https://github.com/Natural-Highs/live/commit/eb688f727b88118566d9c9c5ec8b51899a7e8b37))
* **frontend:** update routing and navigation with React Router ([51ffd30](https://github.com/Natural-Highs/live/commit/51ffd30fe3869e58e9f752d584b15f868902a7c9))
* Guest & Authentication UI + Bypass authentication ([#95](https://github.com/Natural-Highs/live/issues/95)) ([58ec88e](https://github.com/Natural-Highs/live/commit/58ec88e3842a39b5338e66f8ace34fbeb6cc7eff))
* improve entry point type safety ([7310337](https://github.com/Natural-Highs/live/commit/7310337f6bffd44a138895456a3b73e24e91d1f6))
* improve Firebase config and utility type safety ([c181c05](https://github.com/Natural-Highs/live/commit/c181c054aaa2e09631f8a6d1522f3cd63b1fa979))
* migrate from Prettier/ESLint to Biome ([37b69dc](https://github.com/Natural-Highs/live/commit/37b69dc9a84a11389202aabbfc9354517afe8dc2))
* remove SvelteKit routing (migrated to React Router) ([add11f0](https://github.com/Natural-Highs/live/commit/add11f07eccc35774220b4c90ce2e6a1bfc28d5e))
* remove unused pages and components ([#101](https://github.com/Natural-Highs/live/issues/101)) ([4e6070d](https://github.com/Natural-Highs/live/commit/4e6070d0c832ff711b8a9916cd75def0a2c68183))
* **tests:** improve test scripts with type safety ([10ac52f](https://github.com/Natural-Highs/live/commit/10ac52f93eb2bb4a78eed5c2aa6c78677f015f0f))
* **test:** update test scripts and utilities ([836a954](https://github.com/Natural-Highs/live/commit/836a954e4db8eb4480287da422c7f05b428ac974))


### Documentation

* add logo assets and update README ([#40](https://github.com/Natural-Highs/live/issues/40)) ([e6f6d87](https://github.com/Natural-Highs/live/commit/e6f6d87c1a5858cbe5a127e957c2486d83056f99))
* **ci:** refactor directory generation structure ([bc197b0](https://github.com/Natural-Highs/live/commit/bc197b0ce8e05a459434785e67d68df848f3d6f7))
* **ci:** script diagram generation and README updates ([152f7e5](https://github.com/Natural-Highs/live/commit/152f7e510ebc04cc369075d295eae4bd9a635d46))
* **diagrams:** update png renders and overview ([14e741e](https://github.com/Natural-Highs/live/commit/14e741e4d7989f6ce6122916693dff0b333071e5))
* **diagrams:** update png renders and overview ([d4dd55b](https://github.com/Natural-Highs/live/commit/d4dd55b04ffebcf1e79462c8e7b31c80292d8526))
* **diagrams:** update png renders and overview ([fa6c081](https://github.com/Natural-Highs/live/commit/fa6c0817b24d29bb3497e52d27c890d4556dca8a))
* generative repo visualization ([5f1d932](https://github.com/Natural-Highs/live/commit/5f1d9325716f9c61284b8b81ed163e6351174b21))
* PlantUML diagram generation initial config ([97a125b](https://github.com/Natural-Highs/live/commit/97a125bac93b38dea61dad70eeeac84572503c3d))
* project requirements ([e5df076](https://github.com/Natural-Highs/live/commit/e5df076f5eabd8db2fb82861c55d4028553a120f))
* refactor workflow diagram generation and update process ([dd0f64b](https://github.com/Natural-Highs/live/commit/dd0f64bcaba5e6c14410ee332ad242efca9828ea))
* update project readme and add runbook ([d8ce84d](https://github.com/Natural-Highs/live/commit/d8ce84d198fd87c7c47474acc0f4a237a0fbfc35))
* update readme and overview svg ([85c287b](https://github.com/Natural-Highs/live/commit/85c287b460993b0472392779cc7aa09f96ba8d82))
* update readme paths ([e4a06c5](https://github.com/Natural-Highs/live/commit/e4a06c5b966e6bd225578ab2e9682e01d59568bc))


### Tests

* add layer test coverage for all architecture layers ([#23](https://github.com/Natural-Highs/live/issues/23)) ([2aec493](https://github.com/Natural-Highs/live/commit/2aec4930e51a21d1d0ceb744f2c4029368e5ac96))


### CI

* remove linting and build steps ([4c9511a](https://github.com/Natural-Highs/live/commit/4c9511acf76134ea7fa5bb41b0afb65dd1aec4de))

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

## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
