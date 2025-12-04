# Project Requirements & User Stories

## 🎯 Overview

Organized project requirements based on sponsor meetings, including
functionality sections, user stories, and considerations for production
readiness.

------------------------------------------------------------------------

## 🧩 Core Functionalities

### **1. Demographics Collection**

-   Demographics are *extremely important* to Avani.
-   Preferred name should be **optional**.
-   Demographics should be **hidden for minors** in their accounts (because some users may
    not be out to their parents).
-   Data should persist in the database tied to the **user account**.
-   Requires Spanish-language support (auto-translation package may be
    needed; explore accuracy & trust concerns with NLP).

### **2. Events & Attendance Tracking**

-   A user should **only be able to check into an event once**.
-   Avani does **not** need per-date breakdowns (e.g., Oct 21 vs Oct 28)
    --- only category totals:
    -   Tuesday events
    -   Wednesday events
    -   School talks
    -   Etc.
-   Event check-ins must link attendance to:
    -   The **event type** (category)
    -   Anonymous survey responses
    -   NOT the individual's identity

### **3. Surveys**

-   Surveys can be implemented using **Google Forms**.
-   Survey responses must be tied to the **event**, not the **user**.
-   Must integrate survey completion status into event workflows.

### **4. Account Types: Minor vs Adult**

-   Minors need parental signatures.
-   "Teen" in Colorado includes up to age 21.
-   Only difference between adult/minor accounts:
    -   Minor accounts require signature workflow.
-   Term "minor" is confusing --- Avani is researching age specifics.

### **5. Consent & Privacy**

-   Consent form format is approved.
-   Need to update **Privacy Policy / Terms of Service**.
-   Must clearly outline what is stored and why.
-   Important: safely store data for users who may not want parents to
    access certain fields.

### **6. Authentication**

-   Standard login system.
-   Users should only be able to check into an event **one time** per
    event.
-   User profile data should persist (demographics, preferred/legal
    name, age category).

### **7. Admin Portal**

-   Admin event summaries (counts per category).
-   Ability to view:
    -   Attendance totals
    -   Survey summaries
-   Does not need detailed per-user attendance history.

### **8. Branding & Design**

-   Logo change approved.
-   Widget tutorial needed.
-   QR codes should be supported for event check-in.

### **9. Infrastructure & Hosting**

-   Use Google Cloud hosting (separate from current site).
-   Avani owns the domain and can register.
-   Need redirection portal from existing site.
-   Consider reusing template from acudetox project next year.

### **10. Legal & Compliance**

-   Not treatment; educational.
-   Avani determining how long records must be kept.
-   Ensure legal compliance for handling minors' data.

------------------------------------------------------------------------

## 👤 User Stories

### **As a User (Adult or Teen):**

-   I want to create an account so I can check in to events.
-   I want my demographics saved so I don't have to re-enter them.
-   I want to check into an event quickly, ideally via QR code.
-   I want to see my past attendance (if allowed).

### **As a Minor User(Avani looking into exact age):**

-   I want to register with parental consent when required.
-   I want my preferred name to be safe and private.

### **As a Parent of a Minor:**

-   I want to sign consent forms easily.
-   I want to understand what information is being stored.

### **As an Admin (Avani):**

-   I want to see how many people attended each type of event so I can
    report totals.
-   I want surveys tied to events but not to individuals.
-   I want to update privacy policy text visible to users.
-   I want the ability to handle Spanish-speaking users.

------------------------------------------------------------------------

## 📋 Checklist of Work Remaining

### **Backend (High Priority)**

-   [ ] Database models for users, demographics, events, survey
    mappings.
-   [ ] Event category system.
-   [ ] Single check-in enforcement.
-   [ ] Secure storage of preferred vs legal name.
-   [ ] Compliance-driven data storage timelines.
-   [ ] Add Spanish translation module (research accuracy/trust).

### **Frontend**

-   [ ] Login & account creation flow.
-   [ ] Demographics entry & editing (with minor protections).
-   [ ] Event check-in UI (with QR support).
-   [ ] Survey linking confirmation screens.

### **Admin Tools**

-   [ ] Event category dashboard with total counts.
-   [ ] Survey summary view.
-   [ ] Admin-only demographic visibility controls.
-   [ ] Terms of Service / Privacy Policy editor.

### **Infrastructure**

-   [ ] Google Cloud hosting setup.
-   [ ] Domain connection.
-   [ ] Redirection from existing site.
-   [ ] Standarize to be compliant PWA

------------------------------------------------------------------------

## 📎 Notes

-   Avani researching:
    -   Minor age definitions
    -   Required data retention times
-  Questions waiting on Answer:
    -   Integrating GroupMe
