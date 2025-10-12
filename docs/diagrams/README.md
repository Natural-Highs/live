# Natural Highs Repo Overview

![overview svg](out/repo-overview.svg)

## How to Update

1. Save any changes in project root `src/` to be rendered
   - `docs/diagrams/src/` is root `*.puml` equivalent
2. Run `npm run docs:puml`
   - rebuilds`.puml` sources
   - refreshes PNG previews
   - rewrites the catalog below
3. Verify updated sections are successful
4. Commit modified files (auto-formatted .md), push branch, open/merge PR

## Directory

<!-- DIAGRAM-LIST:START -->
<details>
<summary>src [5]</summary>

| Source          | Diagram                                     | Details                                                                                                                 |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| app.css         | ![app_css](src/app_css.png)                 | Path: [`src/app.css.puml`](src/app.css.puml)<br/>Diagram ID: `app_css`<br/>Stereotype: `Styles`                         |
| app.d.ts        | ![app_d_ts](src/app_d_ts.png)               | Path: [`src/app.d.ts.puml`](src/app.d.ts.puml)<br/>Diagram ID: `app_d_ts`<br/>Stereotype: `Module`                      |
| app.html        | ![app_html](src/app_html.png)               | Path: [`src/app.html.puml`](src/app.html.puml)<br/>Diagram ID: `app_html`<br/>Stereotype: `Markup`                      |
| hooks.server.ts | ![hooks_server_ts](src/hooks_server_ts.png) | Path: [`src/hooks.server.ts.puml`](src/hooks.server.ts.puml)<br/>Diagram ID: `hooks_server_ts`<br/>Stereotype: `Module` |
| index.test.ts   | ![index_test_ts](src/index_test_ts.png)     | Path: [`src/index.test.ts.puml`](src/index.test.ts.puml)<br/>Diagram ID: `index_test_ts`<br/>Stereotype: `Module`       |

</details>

<details>
<summary>src/lib [9]</summary>

| Source             | Diagram                                                 | Details                                                                                                                           |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| lib/index.ts       | ![lib__index_ts](src/lib/lib__index_ts.png)             | Path: [`src/lib/index.ts.puml`](src/lib/index.ts.puml)<br/>Diagram ID: `lib__index_ts`<br/>Stereotype: `Module`                   |
| lib/qr-code.ts     | ![lib__qr_code_ts](src/lib/lib__qr_code_ts.png)         | Path: [`src/lib/qr-code.ts.puml`](src/lib/qr-code.ts.puml)<br/>Diagram ID: `lib__qr_code_ts`<br/>Stereotype: `Module`             |
| lib/redisConfig.js | ![lib__redisConfig_js](src/lib/lib__redisConfig_js.png) | Path: [`src/lib/redisConfig.js.puml`](src/lib/redisConfig.js.puml)<br/>Diagram ID: `lib__redisConfig_js`<br/>Stereotype: `Module` |
| lib/sample.spec.ts | ![lib__sample_spec_ts](src/lib/lib__sample_spec_ts.png) | Path: [`src/lib/sample.spec.ts.puml`](src/lib/sample.spec.ts.puml)<br/>Diagram ID: `lib__sample_spec_ts`<br/>Stereotype: `Module` |

<details>
<summary>src/lib/db [1]</summary>

| Source         | Diagram                                              | Details                                                                                                                |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| lib/db/auth.ts | ![lib__db__auth_ts](src/lib/db/lib__db__auth_ts.png) | Path: [`src/lib/db/auth.ts.puml`](src/lib/db/auth.ts.puml)<br/>Diagram ID: `lib__db__auth_ts`<br/>Stereotype: `Module` |

</details>
<details>
<summary>src/lib/firebase [3]</summary>

| Source                         | Diagram                                                                                    | Details                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lib/firebase/firebase.admin.ts | ![lib__firebase__firebase_admin_ts](src/lib/firebase/lib__firebase__firebase_admin_ts.png) | Path: [`src/lib/firebase/firebase.admin.ts.puml`](src/lib/firebase/firebase.admin.ts.puml)<br/>Diagram ID: `lib__firebase__firebase_admin_ts`<br/>Stereotype: `Module` |
| lib/firebase/firebase.app.ts   | ![lib__firebase__firebase_app_ts](src/lib/firebase/lib__firebase__firebase_app_ts.png)     | Path: [`src/lib/firebase/firebase.app.ts.puml`](src/lib/firebase/firebase.app.ts.puml)<br/>Diagram ID: `lib__firebase__firebase_app_ts`<br/>Stereotype: `Module`       |
| lib/firebase/firebase.ts       | ![lib__firebase__firebase_ts](src/lib/firebase/lib__firebase__firebase_ts.png)             | Path: [`src/lib/firebase/firebase.ts.puml`](src/lib/firebase/firebase.ts.puml)<br/>Diagram ID: `lib__firebase__firebase_ts`<br/>Stereotype: `Module`                   |

</details>
<details>
<summary>src/lib/utils [1]</summary>

| Source                     | Diagram                                                                         | Details                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lib/utils/firebaseCalls.ts | ![lib__utils__firebaseCalls_ts](src/lib/utils/lib__utils__firebaseCalls_ts.png) | Path: [`src/lib/utils/firebaseCalls.ts.puml`](src/lib/utils/firebaseCalls.ts.puml)<br/>Diagram ID: `lib__utils__firebaseCalls_ts`<br/>Stereotype: `Module` |

</details>
</details>
<details>
<summary>src/routes [37]</summary>

| Source                 | Diagram                                                          | Details                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/+layout.svelte  | ![routes__layout_svelte](src/routes/routes__layout_svelte.png)   | Path: [`src/routes/+layout.svelte.puml`](src/routes/+layout.svelte.puml)<br/>Diagram ID: `routes__layout_svelte`<br/>Stereotype: `SvelteComponent`    |
| routes/+page.server.ts | ![routes__page_server_ts](src/routes/routes__page_server_ts.png) | Path: [`src/routes/+page.server.ts.puml`](src/routes/+page.server.ts.puml)<br/>Diagram ID: `routes__page_server_ts`<br/>Stereotype: `SvelteKitModule` |
| routes/+page.svelte    | ![routes__page_svelte](src/routes/routes__page_svelte.png)       | Path: [`src/routes/+page.svelte.puml`](src/routes/+page.svelte.puml)<br/>Diagram ID: `routes__page_svelte`<br/>Stereotype: `SvelteComponent`          |
| routes/navbar.svelte   | ![routes__navbar_svelte](src/routes/routes__navbar_svelte.png)   | Path: [`src/routes/navbar.svelte.puml`](src/routes/navbar.svelte.puml)<br/>Diagram ID: `routes__navbar_svelte`<br/>Stereotype: `SvelteComponent`      |

<details>
<summary>src/routes/admin [13]</summary>

| Source                         | Diagram                                                                                  | Details                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/admin/+layout.server.ts | ![routes__admin__layout_server_ts](src/routes/admin/routes__admin__layout_server_ts.png) | Path: [`src/routes/admin/+layout.server.ts.puml`](src/routes/admin/+layout.server.ts.puml)<br/>Diagram ID: `routes__admin__layout_server_ts`<br/>Stereotype: `SvelteKitModule` |
| routes/admin/+layout.svelte    | ![routes__admin__layout_svelte](src/routes/admin/routes__admin__layout_svelte.png)       | Path: [`src/routes/admin/+layout.svelte.puml`](src/routes/admin/+layout.svelte.puml)<br/>Diagram ID: `routes__admin__layout_svelte`<br/>Stereotype: `SvelteComponent`          |
| routes/admin/+page.server.ts   | ![routes__admin__page_server_ts](src/routes/admin/routes__admin__page_server_ts.png)     | Path: [`src/routes/admin/+page.server.ts.puml`](src/routes/admin/+page.server.ts.puml)<br/>Diagram ID: `routes__admin__page_server_ts`<br/>Stereotype: `SvelteKitModule`       |
| routes/admin/+page.svelte      | ![routes__admin__page_svelte](src/routes/admin/routes__admin__page_svelte.png)           | Path: [`src/routes/admin/+page.svelte.puml`](src/routes/admin/+page.svelte.puml)<br/>Diagram ID: `routes__admin__page_svelte`<br/>Stereotype: `SvelteComponent`                |

<details>
<summary>src/routes/admin/charts [1]</summary>

| Source                           | Diagram                                                                                               | Details                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/admin/charts/+page.svelte | ![routes__admin__charts__page_svelte](src/routes/admin/charts/routes__admin__charts__page_svelte.png) | Path: [`src/routes/admin/charts/+page.svelte.puml`](src/routes/admin/charts/+page.svelte.puml)<br/>Diagram ID: `routes__admin__charts__page_svelte`<br/>Stereotype: `SvelteComponent` |

</details>
<details>
<summary>src/routes/admin/qrCode [3]</summary>

| Source                               | Diagram                                                                                                         | Details                                                                                                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/admin/qrCode/+page.server.ts  | ![routes__admin__qrCode__page_server_ts](src/routes/admin/qrCode/routes__admin__qrCode__page_server_ts.png)     | Path: [`src/routes/admin/qrCode/+page.server.ts.puml`](src/routes/admin/qrCode/+page.server.ts.puml)<br/>Diagram ID: `routes__admin__qrCode__page_server_ts`<br/>Stereotype: `SvelteKitModule`     |
| routes/admin/qrCode/+page.svelte     | ![routes__admin__qrCode__page_svelte](src/routes/admin/qrCode/routes__admin__qrCode__page_svelte.png)           | Path: [`src/routes/admin/qrCode/+page.svelte.puml`](src/routes/admin/qrCode/+page.svelte.puml)<br/>Diagram ID: `routes__admin__qrCode__page_svelte`<br/>Stereotype: `SvelteComponent`              |
| routes/admin/qrCode/QRScanner.svelte | ![routes__admin__qrCode__QRScanner_svelte](src/routes/admin/qrCode/routes__admin__qrCode__QRScanner_svelte.png) | Path: [`src/routes/admin/qrCode/QRScanner.svelte.puml`](src/routes/admin/qrCode/QRScanner.svelte.puml)<br/>Diagram ID: `routes__admin__qrCode__QRScanner_svelte`<br/>Stereotype: `SvelteComponent` |

</details>
<details>
<summary>src/routes/admin/survey [5]</summary>

| Source                              | Diagram                                                                                                     | Details                                                                                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/admin/survey/+page.server.ts | ![routes__admin__survey__page_server_ts](src/routes/admin/survey/routes__admin__survey__page_server_ts.png) | Path: [`src/routes/admin/survey/+page.server.ts.puml`](src/routes/admin/survey/+page.server.ts.puml)<br/>Diagram ID: `routes__admin__survey__page_server_ts`<br/>Stereotype: `SvelteKitModule` |
| routes/admin/survey/+page.svelte    | ![routes__admin__survey__page_svelte](src/routes/admin/survey/routes__admin__survey__page_svelte.png)       | Path: [`src/routes/admin/survey/+page.svelte.puml`](src/routes/admin/survey/+page.svelte.puml)<br/>Diagram ID: `routes__admin__survey__page_svelte`<br/>Stereotype: `SvelteComponent`          |

<details>
<summary>src/routes/admin/survey/[id] [3]</summary>

| Source                                          | Diagram                                                                                                                                    | Details                                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/admin/survey/[id]/+page.server.ts        | ![routes__admin__survey__id___page_server_ts](src/routes/admin/survey/[id]/routes__admin__survey__id___page_server_ts.png)                 | Path: [`src/routes/admin/survey/[id]/+page.server.ts.puml`](src/routes/admin/survey/[id]/+page.server.ts.puml)<br/>Diagram ID: `routes__admin__survey__id___page_server_ts`<br/>Stereotype: `SvelteKitModule`                       |
| routes/admin/survey/[id]/+page.svelte           | ![routes__admin__survey__id___page_svelte](src/routes/admin/survey/[id]/routes__admin__survey__id___page_svelte.png)                       | Path: [`src/routes/admin/survey/[id]/+page.svelte.puml`](src/routes/admin/survey/[id]/+page.svelte.puml)<br/>Diagram ID: `routes__admin__survey__id___page_svelte`<br/>Stereotype: `SvelteComponent`                                |
| routes/admin/survey/[id]/NewQuestionForm.svelte | ![routes__admin__survey__id___NewQuestionForm_svelte](src/routes/admin/survey/[id]/routes__admin__survey__id___NewQuestionForm_svelte.png) | Path: [`src/routes/admin/survey/[id]/NewQuestionForm.svelte.puml`](src/routes/admin/survey/[id]/NewQuestionForm.svelte.puml)<br/>Diagram ID: `routes__admin__survey__id___NewQuestionForm_svelte`<br/>Stereotype: `SvelteComponent` |

</details>
</details>
</details>
<details>
<summary>src/routes/api [9]</summary>

<details>
<summary>src/routes/api/adminSurvey [1]</summary>

| Source                            | Diagram                                                                                                    | Details                                                                                                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/adminSurvey/+server.ts | ![routes__api__adminSurvey__server_ts](src/routes/api/adminSurvey/routes__api__adminSurvey__server_ts.png) | Path: [`src/routes/api/adminSurvey/+server.ts.puml`](src/routes/api/adminSurvey/+server.ts.puml)<br/>Diagram ID: `routes__api__adminSurvey__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/initialSurvey [1]</summary>

| Source                              | Diagram                                                                                                          | Details                                                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/initialSurvey/+server.ts | ![routes__api__initialSurvey__server_ts](src/routes/api/initialSurvey/routes__api__initialSurvey__server_ts.png) | Path: [`src/routes/api/initialSurvey/+server.ts.puml`](src/routes/api/initialSurvey/+server.ts.puml)<br/>Diagram ID: `routes__api__initialSurvey__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/login [1]</summary>

| Source                      | Diagram                                                                                  | Details                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/login/+server.ts | ![routes__api__login__server_ts](src/routes/api/login/routes__api__login__server_ts.png) | Path: [`src/routes/api/login/+server.ts.puml`](src/routes/api/login/+server.ts.puml)<br/>Diagram ID: `routes__api__login__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/logout [1]</summary>

| Source                       | Diagram                                                                                     | Details                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/api/logout/+server.ts | ![routes__api__logout__server_ts](src/routes/api/logout/routes__api__logout__server_ts.png) | Path: [`src/routes/api/logout/+server.ts.puml`](src/routes/api/logout/+server.ts.puml)<br/>Diagram ID: `routes__api__logout__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/sessionLogin [1]</summary>

| Source                             | Diagram                                                                                                       | Details                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/api/sessionLogin/+server.ts | ![routes__api__sessionLogin__server_ts](src/routes/api/sessionLogin/routes__api__sessionLogin__server_ts.png) | Path: [`src/routes/api/sessionLogin/+server.ts.puml`](src/routes/api/sessionLogin/+server.ts.puml)<br/>Diagram ID: `routes__api__sessionLogin__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/surveyQuestions [1]</summary>

| Source                                | Diagram                                                                                                                | Details                                                                                                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/surveyQuestions/+server.ts | ![routes__api__surveyQuestions__server_ts](src/routes/api/surveyQuestions/routes__api__surveyQuestions__server_ts.png) | Path: [`src/routes/api/surveyQuestions/+server.ts.puml`](src/routes/api/surveyQuestions/+server.ts.puml)<br/>Diagram ID: `routes__api__surveyQuestions__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/surveys [1]</summary>

| Source                        | Diagram                                                                                        | Details                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/surveys/+server.ts | ![routes__api__surveys__server_ts](src/routes/api/surveys/routes__api__surveys__server_ts.png) | Path: [`src/routes/api/surveys/+server.ts.puml`](src/routes/api/surveys/+server.ts.puml)<br/>Diagram ID: `routes__api__surveys__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/userResponses [1]</summary>

| Source                              | Diagram                                                                                                          | Details                                                                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/userResponses/+server.ts | ![routes__api__userResponses__server_ts](src/routes/api/userResponses/routes__api__userResponses__server_ts.png) | Path: [`src/routes/api/userResponses/+server.ts.puml`](src/routes/api/userResponses/+server.ts.puml)<br/>Diagram ID: `routes__api__userResponses__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
<details>
<summary>src/routes/api/users [1]</summary>

| Source                      | Diagram                                                                                  | Details                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/api/users/+server.ts | ![routes__api__users__server_ts](src/routes/api/users/routes__api__users__server_ts.png) | Path: [`src/routes/api/users/+server.ts.puml`](src/routes/api/users/+server.ts.puml)<br/>Diagram ID: `routes__api__users__server_ts`<br/>Stereotype: `SvelteKitEndpoint` |

</details>
</details>
<details>
<summary>src/routes/authentication [6]</summary>

| Source                                    | Diagram                                                                                                                   | Details                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routes/authentication/+layout.svelte      | ![routes__authentication__layout_svelte](src/routes/authentication/routes__authentication__layout_svelte.png)             | Path: [`src/routes/authentication/+layout.svelte.puml`](src/routes/authentication/+layout.svelte.puml)<br/>Diagram ID: `routes__authentication__layout_svelte`<br/>Stereotype: `SvelteComponent`          |
| routes/authentication/+page.server.ts     | ![routes__authentication__page_server_ts](src/routes/authentication/routes__authentication__page_server_ts.png)           | Path: [`src/routes/authentication/+page.server.ts.puml`](src/routes/authentication/+page.server.ts.puml)<br/>Diagram ID: `routes__authentication__page_server_ts`<br/>Stereotype: `SvelteKitModule`       |
| routes/authentication/+page.svelte        | ![routes__authentication__page_svelte](src/routes/authentication/routes__authentication__page_svelte.png)                 | Path: [`src/routes/authentication/+page.svelte.puml`](src/routes/authentication/+page.svelte.puml)<br/>Diagram ID: `routes__authentication__page_svelte`<br/>Stereotype: `SvelteComponent`                |
| routes/authentication/firebase-debug.log  | ![routes__authentication__firebase_debug_log](src/routes/authentication/routes__authentication__firebase_debug_log.png)   | Path: [`src/routes/authentication/firebase-debug.log.puml`](src/routes/authentication/firebase-debug.log.puml)<br/>Diagram ID: `routes__authentication__firebase_debug_log`<br/>Stereotype: `Artifact`    |
| routes/authentication/firestore-debug.log | ![routes__authentication__firestore_debug_log](src/routes/authentication/routes__authentication__firestore_debug_log.png) | Path: [`src/routes/authentication/firestore-debug.log.puml`](src/routes/authentication/firestore-debug.log.puml)<br/>Diagram ID: `routes__authentication__firestore_debug_log`<br/>Stereotype: `Artifact` |
| routes/authentication/ui-debug.log        | ![routes__authentication__ui_debug_log](src/routes/authentication/routes__authentication__ui_debug_log.png)               | Path: [`src/routes/authentication/ui-debug.log.puml`](src/routes/authentication/ui-debug.log.puml)<br/>Diagram ID: `routes__authentication__ui_debug_log`<br/>Stereotype: `Artifact`                      |

</details>
<details>
<summary>src/routes/dashboard [3]</summary>

| Source                           | Diagram                                                                                          | Details                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/dashboard/+page.server.ts | ![routes__dashboard__page_server_ts](src/routes/dashboard/routes__dashboard__page_server_ts.png) | Path: [`src/routes/dashboard/+page.server.ts.puml`](src/routes/dashboard/+page.server.ts.puml)<br/>Diagram ID: `routes__dashboard__page_server_ts`<br/>Stereotype: `SvelteKitModule` |
| routes/dashboard/+page.svelte    | ![routes__dashboard__page_svelte](src/routes/dashboard/routes__dashboard__page_svelte.png)       | Path: [`src/routes/dashboard/+page.svelte.puml`](src/routes/dashboard/+page.svelte.puml)<br/>Diagram ID: `routes__dashboard__page_svelte`<br/>Stereotype: `SvelteComponent`          |

<details>
<summary>src/routes/dashboard/[id] [1]</summary>

| Source                             | Diagram                                                                                                   | Details                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/dashboard/[id]/+page.svelte | ![routes__dashboard__id___page_svelte](src/routes/dashboard/[id]/routes__dashboard__id___page_svelte.png) | Path: [`src/routes/dashboard/[id]/+page.svelte.puml`](src/routes/dashboard/[id]/+page.svelte.puml)<br/>Diagram ID: `routes__dashboard__id___page_svelte`<br/>Stereotype: `SvelteComponent` |

</details>
</details>
<details>
<summary>src/routes/initialSurvey [2]</summary>

| Source                               | Diagram                                                                                                      | Details                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| routes/initialSurvey/+page.server.ts | ![routes__initialSurvey__page_server_ts](src/routes/initialSurvey/routes__initialSurvey__page_server_ts.png) | Path: [`src/routes/initialSurvey/+page.server.ts.puml`](src/routes/initialSurvey/+page.server.ts.puml)<br/>Diagram ID: `routes__initialSurvey__page_server_ts`<br/>Stereotype: `SvelteKitModule` |
| routes/initialSurvey/+page.svelte    | ![routes__initialSurvey__page_svelte](src/routes/initialSurvey/routes__initialSurvey__page_svelte.png)       | Path: [`src/routes/initialSurvey/+page.svelte.puml`](src/routes/initialSurvey/+page.svelte.puml)<br/>Diagram ID: `routes__initialSurvey__page_svelte`<br/>Stereotype: `SvelteComponent`          |

</details>
</details>
<details>
<summary>src/store [1]</summary>

| Source         | Diagram                                           | Details                                                                                                               |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| store/store.ts | ![store__store_ts](src/store/store__store_ts.png) | Path: [`src/store/store.ts.puml`](src/store/store.ts.puml)<br/>Diagram ID: `store__store_ts`<br/>Stereotype: `Module` |

</details>
<!-- DIAGRAM-LIST:END -->
