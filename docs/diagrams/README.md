# Natural Highs Repo Overview

![overview svg](out/repo-overview.svg)

## How to Update

1. Save any changes in project root `src/` to be rendered
   - `docs/diagrams/src/` is root `*.puml` equivalent
2. Run `bun run docs:puml`
   - rebuilds`.puml` sources
   - refreshes PNG previews
   - rewrites the catalog below
3. Verify updated sections are successful
4. Commit modified files (auto-formatted .md), push branch, open/merge PR

## Directory

<!-- DIAGRAM-LIST:START -->
<details>
<summary>src [6]</summary>

| Source        | Diagram                                 | Details                                                                                                           |
| ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| app.css       | ![app_css](src/app_css.png)             | Path: [`src/app.css.puml`](src/app.css.puml)<br/>Diagram ID: `app_css`<br/>Stereotype: `Styles`                   |
| app.d.ts      | ![app_d_ts](src/app_d_ts.png)           | Path: [`src/app.d.ts.puml`](src/app.d.ts.puml)<br/>Diagram ID: `app_d_ts`<br/>Stereotype: `Module`                |
| app.html      | ![app_html](src/app_html.png)           | Path: [`src/app.html.puml`](src/app.html.puml)<br/>Diagram ID: `app_html`<br/>Stereotype: `Markup`                |
| App.tsx       | ![App_tsx](src/App_tsx.png)             | Path: [`src/App.tsx.puml`](src/App.tsx.puml)<br/>Diagram ID: `App_tsx`<br/>Stereotype: `Artifact`                 |
| index.test.ts | ![index_test_ts](src/index_test_ts.png) | Path: [`src/index.test.ts.puml`](src/index.test.ts.puml)<br/>Diagram ID: `index_test_ts`<br/>Stereotype: `Module` |
| main.tsx      | ![main_tsx](src/main_tsx.png)           | Path: [`src/main.tsx.puml`](src/main.tsx.puml)<br/>Diagram ID: `main_tsx`<br/>Stereotype: `Artifact`              |

</details>

<details>
<summary>src/components [11]</summary>

| Source                        | Diagram                                                                              | Details                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| components/AdminRoute.tsx     | ![components__AdminRoute_tsx](src/components/components__AdminRoute_tsx.png)         | Path: [`src/components/AdminRoute.tsx.puml`](src/components/AdminRoute.tsx.puml)<br/>Diagram ID: `components__AdminRoute_tsx`<br/>Stereotype: `Artifact`             |
| components/Layout.tsx         | ![components__Layout_tsx](src/components/components__Layout_tsx.png)                 | Path: [`src/components/Layout.tsx.puml`](src/components/Layout.tsx.puml)<br/>Diagram ID: `components__Layout_tsx`<br/>Stereotype: `Artifact`                         |
| components/Navbar.tsx         | ![components__Navbar_tsx](src/components/components__Navbar_tsx.png)                 | Path: [`src/components/Navbar.tsx.puml`](src/components/Navbar.tsx.puml)<br/>Diagram ID: `components__Navbar_tsx`<br/>Stereotype: `Artifact`                         |
| components/ProtectedRoute.tsx | ![components__ProtectedRoute_tsx](src/components/components__ProtectedRoute_tsx.png) | Path: [`src/components/ProtectedRoute.tsx.puml`](src/components/ProtectedRoute.tsx.puml)<br/>Diagram ID: `components__ProtectedRoute_tsx`<br/>Stereotype: `Artifact` |

<details>
<summary>src/components/ui [7]</summary>

| Source                           | Diagram                                                                                         | Details                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| components/ui/button.test.tsx    | ![components__ui__button_test_tsx](src/components/ui/components__ui__button_test_tsx.png)       | Path: [`src/components/ui/button.test.tsx.puml`](src/components/ui/button.test.tsx.puml)<br/>Diagram ID: `components__ui__button_test_tsx`<br/>Stereotype: `Artifact`          |
| components/ui/chart.tsx          | ![components__ui__chart_tsx](src/components/ui/components__ui__chart_tsx.png)                   | Path: [`src/components/ui/chart.tsx.puml`](src/components/ui/chart.tsx.puml)<br/>Diagram ID: `components__ui__chart_tsx`<br/>Stereotype: `Artifact`                            |
| components/ui/divider.tsx        | ![components__ui__divider_tsx](src/components/ui/components__ui__divider_tsx.png)               | Path: [`src/components/ui/divider.tsx.puml`](src/components/ui/divider.tsx.puml)<br/>Diagram ID: `components__ui__divider_tsx`<br/>Stereotype: `Artifact`                      |
| components/ui/form-container.tsx | ![components__ui__form_container_tsx](src/components/ui/components__ui__form_container_tsx.png) | Path: [`src/components/ui/form-container.tsx.puml`](src/components/ui/form-container.tsx.puml)<br/>Diagram ID: `components__ui__form_container_tsx`<br/>Stereotype: `Artifact` |
| components/ui/logo.tsx           | ![components__ui__logo_tsx](src/components/ui/components__ui__logo_tsx.png)                     | Path: [`src/components/ui/logo.tsx.puml`](src/components/ui/logo.tsx.puml)<br/>Diagram ID: `components__ui__logo_tsx`<br/>Stereotype: `Artifact`                               |
| components/ui/page-container.tsx | ![components__ui__page_container_tsx](src/components/ui/components__ui__page_container_tsx.png) | Path: [`src/components/ui/page-container.tsx.puml`](src/components/ui/page-container.tsx.puml)<br/>Diagram ID: `components__ui__page_container_tsx`<br/>Stereotype: `Artifact` |
| components/ui/page-header.tsx    | ![components__ui__page_header_tsx](src/components/ui/components__ui__page_header_tsx.png)       | Path: [`src/components/ui/page-header.tsx.puml`](src/components/ui/page-header.tsx.puml)<br/>Diagram ID: `components__ui__page_header_tsx`<br/>Stereotype: `Artifact`          |

</details>
</details>
<details>
<summary>src/context [2]</summary>

| Source                  | Diagram                                                               | Details                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| context/AuthContext.tsx | ![context__AuthContext_tsx](src/context/context__AuthContext_tsx.png) | Path: [`src/context/AuthContext.tsx.puml`](src/context/AuthContext.tsx.puml)<br/>Diagram ID: `context__AuthContext_tsx`<br/>Stereotype: `Artifact` |

<details>
<summary>src/context/types [1]</summary>

| Source                       | Diagram                                                                                 | Details                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| context/types/authContext.ts | ![context__types__authContext_ts](src/context/types/context__types__authContext_ts.png) | Path: [`src/context/types/authContext.ts.puml`](src/context/types/authContext.ts.puml)<br/>Diagram ID: `context__types__authContext_ts`<br/>Stereotype: `Module` |

</details>
</details>
<details>
<summary>src/lib [7]</summary>

| Source             | Diagram                                                 | Details                                                                                                                           |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| lib/index.ts       | ![lib__index_ts](src/lib/lib__index_ts.png)             | Path: [`src/lib/index.ts.puml`](src/lib/index.ts.puml)<br/>Diagram ID: `lib__index_ts`<br/>Stereotype: `Module`                   |
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
<summary>src/pages [7]</summary>

| Source                       | Diagram                                                                       | Details                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pages/AdminPage.tsx          | ![pages__AdminPage_tsx](src/pages/pages__AdminPage_tsx.png)                   | Path: [`src/pages/AdminPage.tsx.puml`](src/pages/AdminPage.tsx.puml)<br/>Diagram ID: `pages__AdminPage_tsx`<br/>Stereotype: `Artifact`                            |
| pages/AuthenticationPage.tsx | ![pages__AuthenticationPage_tsx](src/pages/pages__AuthenticationPage_tsx.png) | Path: [`src/pages/AuthenticationPage.tsx.puml`](src/pages/AuthenticationPage.tsx.puml)<br/>Diagram ID: `pages__AuthenticationPage_tsx`<br/>Stereotype: `Artifact` |
| pages/ConsentFormPage.tsx    | ![pages__ConsentFormPage_tsx](src/pages/pages__ConsentFormPage_tsx.png)       | Path: [`src/pages/ConsentFormPage.tsx.puml`](src/pages/ConsentFormPage.tsx.puml)<br/>Diagram ID: `pages__ConsentFormPage_tsx`<br/>Stereotype: `Artifact`          |
| pages/DashboardPage.tsx      | ![pages__DashboardPage_tsx](src/pages/pages__DashboardPage_tsx.png)           | Path: [`src/pages/DashboardPage.tsx.puml`](src/pages/DashboardPage.tsx.puml)<br/>Diagram ID: `pages__DashboardPage_tsx`<br/>Stereotype: `Artifact`                |
| pages/HomePage.tsx           | ![pages__HomePage_tsx](src/pages/pages__HomePage_tsx.png)                     | Path: [`src/pages/HomePage.tsx.puml`](src/pages/HomePage.tsx.puml)<br/>Diagram ID: `pages__HomePage_tsx`<br/>Stereotype: `Artifact`                               |
| pages/SignUpPage1.tsx        | ![pages__SignUpPage1_tsx](src/pages/pages__SignUpPage1_tsx.png)               | Path: [`src/pages/SignUpPage1.tsx.puml`](src/pages/SignUpPage1.tsx.puml)<br/>Diagram ID: `pages__SignUpPage1_tsx`<br/>Stereotype: `Artifact`                      |
| pages/SignUpPage2.tsx        | ![pages__SignUpPage2_tsx](src/pages/pages__SignUpPage2_tsx.png)               | Path: [`src/pages/SignUpPage2.tsx.puml`](src/pages/SignUpPage2.tsx.puml)<br/>Diagram ID: `pages__SignUpPage2_tsx`<br/>Stereotype: `Artifact`                      |

</details>
<details>
<summary>src/server [22]</summary>

| Source          | Diagram                                              | Details                                                                                                                  |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| server/index.ts | ![server__index_ts](src/server/server__index_ts.png) | Path: [`src/server/index.ts.puml`](src/server/index.ts.puml)<br/>Diagram ID: `server__index_ts`<br/>Stereotype: `Module` |
| server/types.ts | ![server__types_ts](src/server/server__types_ts.png) | Path: [`src/server/types.ts.puml`](src/server/types.ts.puml)<br/>Diagram ID: `server__types_ts`<br/>Stereotype: `Module` |

<details>
<summary>src/server/middleware [2]</summary>

| Source                            | Diagram                                                                                               | Details                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| server/middleware/auth.ts         | ![server__middleware__auth_ts](src/server/middleware/server__middleware__auth_ts.png)                 | Path: [`src/server/middleware/auth.ts.puml`](src/server/middleware/auth.ts.puml)<br/>Diagram ID: `server__middleware__auth_ts`<br/>Stereotype: `Module`                         |
| server/middleware/errorHandler.ts | ![server__middleware__errorHandler_ts](src/server/middleware/server__middleware__errorHandler_ts.png) | Path: [`src/server/middleware/errorHandler.ts.puml`](src/server/middleware/errorHandler.ts.puml)<br/>Diagram ID: `server__middleware__errorHandler_ts`<br/>Stereotype: `Module` |

</details>
<details>
<summary>src/server/routes [8]</summary>

| Source                         | Diagram                                                                                     | Details                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| server/routes/auth.ts          | ![server__routes__auth_ts](src/server/routes/server__routes__auth_ts.png)                   | Path: [`src/server/routes/auth.ts.puml`](src/server/routes/auth.ts.puml)<br/>Diagram ID: `server__routes__auth_ts`<br/>Stereotype: `Module`                            |
| server/routes/events.ts        | ![server__routes__events_ts](src/server/routes/server__routes__events_ts.png)               | Path: [`src/server/routes/events.ts.puml`](src/server/routes/events.ts.puml)<br/>Diagram ID: `server__routes__events_ts`<br/>Stereotype: `Module`                      |
| server/routes/eventTypes.ts    | ![server__routes__eventTypes_ts](src/server/routes/server__routes__eventTypes_ts.png)       | Path: [`src/server/routes/eventTypes.ts.puml`](src/server/routes/eventTypes.ts.puml)<br/>Diagram ID: `server__routes__eventTypes_ts`<br/>Stereotype: `Module`          |
| server/routes/forms.ts         | ![server__routes__forms_ts](src/server/routes/server__routes__forms_ts.png)                 | Path: [`src/server/routes/forms.ts.puml`](src/server/routes/forms.ts.puml)<br/>Diagram ID: `server__routes__forms_ts`<br/>Stereotype: `Module`                         |
| server/routes/formTemplates.ts | ![server__routes__formTemplates_ts](src/server/routes/server__routes__formTemplates_ts.png) | Path: [`src/server/routes/formTemplates.ts.puml`](src/server/routes/formTemplates.ts.puml)<br/>Diagram ID: `server__routes__formTemplates_ts`<br/>Stereotype: `Module` |
| server/routes/guests.ts        | ![server__routes__guests_ts](src/server/routes/server__routes__guests_ts.png)               | Path: [`src/server/routes/guests.ts.puml`](src/server/routes/guests.ts.puml)<br/>Diagram ID: `server__routes__guests_ts`<br/>Stereotype: `Module`                      |
| server/routes/surveys.ts       | ![server__routes__surveys_ts](src/server/routes/server__routes__surveys_ts.png)             | Path: [`src/server/routes/surveys.ts.puml`](src/server/routes/surveys.ts.puml)<br/>Diagram ID: `server__routes__surveys_ts`<br/>Stereotype: `Module`                   |
| server/routes/users.ts         | ![server__routes__users_ts](src/server/routes/server__routes__users_ts.png)                 | Path: [`src/server/routes/users.ts.puml`](src/server/routes/users.ts.puml)<br/>Diagram ID: `server__routes__users_ts`<br/>Stereotype: `Module`                         |

</details>
<details>
<summary>src/server/types [10]</summary>

| Source                        | Diagram                                                                                  | Details                                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| server/types/auth.ts          | ![server__types__auth_ts](src/server/types/server__types__auth_ts.png)                   | Path: [`src/server/types/auth.ts.puml`](src/server/types/auth.ts.puml)<br/>Diagram ID: `server__types__auth_ts`<br/>Stereotype: `Module`                            |
| server/types/events.ts        | ![server__types__events_ts](src/server/types/server__types__events_ts.png)               | Path: [`src/server/types/events.ts.puml`](src/server/types/events.ts.puml)<br/>Diagram ID: `server__types__events_ts`<br/>Stereotype: `Module`                      |
| server/types/eventTypes.ts    | ![server__types__eventTypes_ts](src/server/types/server__types__eventTypes_ts.png)       | Path: [`src/server/types/eventTypes.ts.puml`](src/server/types/eventTypes.ts.puml)<br/>Diagram ID: `server__types__eventTypes_ts`<br/>Stereotype: `Module`          |
| server/types/forms.ts         | ![server__types__forms_ts](src/server/types/server__types__forms_ts.png)                 | Path: [`src/server/types/forms.ts.puml`](src/server/types/forms.ts.puml)<br/>Diagram ID: `server__types__forms_ts`<br/>Stereotype: `Module`                         |
| server/types/formTemplates.ts | ![server__types__formTemplates_ts](src/server/types/server__types__formTemplates_ts.png) | Path: [`src/server/types/formTemplates.ts.puml`](src/server/types/formTemplates.ts.puml)<br/>Diagram ID: `server__types__formTemplates_ts`<br/>Stereotype: `Module` |
| server/types/guests.ts        | ![server__types__guests_ts](src/server/types/server__types__guests_ts.png)               | Path: [`src/server/types/guests.ts.puml`](src/server/types/guests.ts.puml)<br/>Diagram ID: `server__types__guests_ts`<br/>Stereotype: `Module`                      |
| server/types/surveyData.ts    | ![server__types__surveyData_ts](src/server/types/server__types__surveyData_ts.png)       | Path: [`src/server/types/surveyData.ts.puml`](src/server/types/surveyData.ts.puml)<br/>Diagram ID: `server__types__surveyData_ts`<br/>Stereotype: `Module`          |
| server/types/surveys.ts       | ![server__types__surveys_ts](src/server/types/server__types__surveys_ts.png)             | Path: [`src/server/types/surveys.ts.puml`](src/server/types/surveys.ts.puml)<br/>Diagram ID: `server__types__surveys_ts`<br/>Stereotype: `Module`                   |
| server/types/updateData.ts    | ![server__types__updateData_ts](src/server/types/server__types__updateData_ts.png)       | Path: [`src/server/types/updateData.ts.puml`](src/server/types/updateData.ts.puml)<br/>Diagram ID: `server__types__updateData_ts`<br/>Stereotype: `Module`          |
| server/types/users.ts         | ![server__types__users_ts](src/server/types/server__types__users_ts.png)                 | Path: [`src/server/types/users.ts.puml`](src/server/types/users.ts.puml)<br/>Diagram ID: `server__types__users_ts`<br/>Stereotype: `Module`                         |

</details>
</details>
<!-- DIAGRAM-LIST:END -->
