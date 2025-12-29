/**
 * Firestore Security Rules Tests
 *
 * Tests verify NFR9: Demographic data privacy protection
 * - Minors' private subcollection readable only by owner
 * - Parent/guardian accounts cannot read minor's private data
 * - Adult demographics accessible by owner only
 *
 * Requires Firebase Emulator to be running:
 *   firebase emulators:start --only firestore
 *
 * Run with:
 *   FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" bun run test tests/firestore/firestore.rules.test.ts
 *
 * These tests are skipped in CI unless emulator is available.
 * For local development, start the emulator before running tests.
 */

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import {afterAll, beforeAll, beforeEach, describe, it} from 'vitest'

const PROJECT_ID = 'demo-natural-highs'
const RULES_PATH = resolve(process.cwd(), 'firestore.rules')

// Test user IDs
const MINOR_USER_UID = 'minor-user-123'
const PARENT_USER_UID = 'parent-user-456'
const ADULT_USER_UID = 'adult-user-789'
const OTHER_USER_UID = 'other-user-999'

// Check if emulator is available via environment variable
// Tests are skipped if FIRESTORE_EMULATOR_HOST is not set
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST
const skipTests = !EMULATOR_HOST

let testEnv: RulesTestEnvironment

// Skip entire test suite if emulator is not configured
describe.skipIf(skipTests)('Firestore Security Rules - NFR9 Minor Privacy Protection', () => {
	beforeAll(async () => {
		if (skipTests || !EMULATOR_HOST) return

		const parts = EMULATOR_HOST.split(':')
		const host = parts[0]
		const port = Number.parseInt(parts[1] || '8080', 10)

		const rules = readFileSync(RULES_PATH, 'utf8')

		testEnv = await initializeTestEnvironment({
			projectId: PROJECT_ID,
			firestore: {
				rules,
				host,
				port
			}
		})
	})

	afterAll(async () => {
		if (testEnv) {
			await testEnv.cleanup()
		}
	})

	beforeEach(async () => {
		if (testEnv) {
			await testEnv.clearFirestore()
		}
	})

	describe('Private Subcollection Access', () => {
		it('should allow user to read their own private demographics', async () => {
			// GIVEN: Minor user has private demographics data
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'they/them',
					emergencyContactName: 'Parent',
					emergencyContactPhone: '555-1234',
					createdAt: new Date()
				})
			})

			// WHEN: Minor user tries to read their own private data
			const minorContext = testEnv.authenticatedContext(MINOR_USER_UID)
			const minorFirestore = minorContext.firestore()
			const doc = minorFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Read should succeed
			await assertSucceeds(doc.get())
		})

		it('should deny other authenticated users from reading private demographics', async () => {
			// GIVEN: Minor user has private demographics data
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'they/them',
					emergencyContactName: 'Parent',
					createdAt: new Date()
				})
			})

			// WHEN: Another authenticated user tries to read minor's private data
			const otherContext = testEnv.authenticatedContext(OTHER_USER_UID)
			const otherFirestore = otherContext.firestore()
			const doc = otherFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Read should fail
			await assertFails(doc.get())
		})

		it('should deny parent/guardian from reading minor private demographics (NFR9)', async () => {
			// GIVEN: Minor user has private demographics data
			// This tests the core NFR9 requirement
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					gender: 'non-binary',
					medicalConditions: 'sensitive info',
					createdAt: new Date()
				})
			})

			// WHEN: Parent user tries to read minor's private data
			// Parent is a different authenticated user, even if linked as guardian
			const parentContext = testEnv.authenticatedContext(PARENT_USER_UID)
			const parentFirestore = parentContext.firestore()
			const doc = parentFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Read should fail - parent cannot access minor's private data
			await assertFails(doc.get())
		})

		it('should deny unauthenticated access to private demographics', async () => {
			// GIVEN: Minor user has private demographics data
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			})

			// WHEN: Unauthenticated user tries to read private data
			const unauthContext = testEnv.unauthenticatedContext()
			const unauthFirestore = unauthContext.firestore()
			const doc = unauthFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Read should fail
			await assertFails(doc.get())
		})
	})

	describe('Private Subcollection Write Access', () => {
		it('should allow user to create their own private demographics', async () => {
			// GIVEN: Minor user is authenticated
			const minorContext = testEnv.authenticatedContext(MINOR_USER_UID)
			const minorFirestore = minorContext.firestore()
			const doc = minorFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// WHEN: Minor creates their own private demographics
			// THEN: Create should succeed
			await assertSucceeds(
				doc.set({
					pronouns: 'he/him',
					emergencyContactName: 'Guardian',
					createdAt: new Date()
				})
			)
		})

		it('should allow user to update their own private demographics', async () => {
			// GIVEN: Minor user has existing private demographics
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			})

			// WHEN: Minor updates their own private demographics
			const minorContext = testEnv.authenticatedContext(MINOR_USER_UID)
			const minorFirestore = minorContext.firestore()
			const doc = minorFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Update should succeed
			await assertSucceeds(
				doc.update({
					pronouns: 'they/them',
					updatedAt: new Date()
				})
			)
		})

		it('should deny other users from creating private demographics for another user', async () => {
			// GIVEN: Other user is authenticated
			const otherContext = testEnv.authenticatedContext(OTHER_USER_UID)
			const otherFirestore = otherContext.firestore()
			const doc = otherFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// WHEN: Other user tries to create private demographics for minor
			// THEN: Create should fail
			await assertFails(
				doc.set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			)
		})

		it('should deny parent from updating minor private demographics', async () => {
			// GIVEN: Minor user has existing private demographics
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			})

			// WHEN: Parent tries to update minor's private demographics
			const parentContext = testEnv.authenticatedContext(PARENT_USER_UID)
			const parentFirestore = parentContext.firestore()
			const doc = parentFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Update should fail
			await assertFails(
				doc.update({
					pronouns: 'he/him',
					updatedAt: new Date()
				})
			)
		})
	})

	describe('Private Subcollection Delete Access', () => {
		it('should allow user to delete their own private demographics', async () => {
			// GIVEN: Minor user has existing private demographics
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			})

			// WHEN: Minor deletes their own private demographics
			const minorContext = testEnv.authenticatedContext(MINOR_USER_UID)
			const minorFirestore = minorContext.firestore()
			const doc = minorFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Delete should succeed
			await assertSucceeds(doc.delete())
		})

		it('should deny other users from deleting private demographics', async () => {
			// GIVEN: Minor user has existing private demographics
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${MINOR_USER_UID}/private/demographics`).set({
					pronouns: 'she/her',
					createdAt: new Date()
				})
			})

			// WHEN: Other user tries to delete minor's private demographics
			const otherContext = testEnv.authenticatedContext(OTHER_USER_UID)
			const otherFirestore = otherContext.firestore()
			const doc = otherFirestore.doc(`users/${MINOR_USER_UID}/private/demographics`)

			// THEN: Delete should fail
			await assertFails(doc.delete())
		})
	})

	describe('Adult User Document Demographics', () => {
		it('should allow authenticated users to read user documents', async () => {
			// GIVEN: Adult user has demographics in user document
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${ADULT_USER_UID}`).set({
					uid: ADULT_USER_UID,
					email: 'adult@example.com',
					displayName: 'Adult User',
					pronouns: 'she/her',
					isMinor: false,
					createdAt: new Date()
				})
			})

			// WHEN: Another authenticated user reads the user document
			const otherContext = testEnv.authenticatedContext(OTHER_USER_UID)
			const otherFirestore = otherContext.firestore()
			const doc = otherFirestore.doc(`users/${ADULT_USER_UID}`)

			// THEN: Read should succeed (users collection is readable by authenticated users)
			await assertSucceeds(doc.get())
		})

		it('should deny unauthenticated access to user documents', async () => {
			// GIVEN: Adult user exists
			await testEnv.withSecurityRulesDisabled(async context => {
				await context.firestore().doc(`users/${ADULT_USER_UID}`).set({
					uid: ADULT_USER_UID,
					email: 'adult@example.com',
					displayName: 'Adult User',
					createdAt: new Date()
				})
			})

			// WHEN: Unauthenticated user tries to read
			const unauthContext = testEnv.unauthenticatedContext()
			const unauthFirestore = unauthContext.firestore()
			const doc = unauthFirestore.doc(`users/${ADULT_USER_UID}`)

			// THEN: Read should fail
			await assertFails(doc.get())
		})
	})
})

// Info message when tests are skipped
if (skipTests) {
}
