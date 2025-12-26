/**
 * Profile Settings Route
 *
 * Allows users to update their profile and demographic information.
 * Pre-fills form with current data from Firestore.
 * Implements concurrent edit protection with conflict detection.
 *
 * @module routes/_authed/settings/profile
 */

import {useMutation, useQueryClient} from '@tanstack/react-query'
import {createFileRoute, useRouter} from '@tanstack/react-router'
import {useState} from 'react'
import {toast} from 'sonner'
import {ProfileSettingsForm} from '@/components/forms/ProfileSettingsForm'
import {Button} from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {
	type FullProfileData,
	getFullProfileFn,
	updateDemographicsWithHistoryFn,
	updateProfileWithHistoryFn
} from '@/server/functions/profile-settings'
import {CONFLICT_ERROR_CODE, ConflictError} from '@/server/functions/utils/errors'
import type {DemographicsData} from '@/server/schemas/profile'

/**
 * Maximum number of conflict retry attempts before forcing page refresh.
 */
const MAX_CONFLICT_RETRIES = 3

/**
 * Check if profile display name has changed.
 */
function hasProfileChanged(oldDisplayName: string | null, newDisplayName: string): boolean {
	return newDisplayName !== oldDisplayName
}

/**
 * Check if demographics have changed by comparing JSON serializations.
 *
 * Uses `?? {}` to handle null/undefined demographics by coercing to empty object
 * for JSON comparison. This differs from `?.` optional chaining because we need
 * a valid object for JSON.stringify, not undefined which would produce "undefined"
 * string output causing false positives in change detection.
 */
function hasDemographicsChanged(
	oldDemographics: DemographicsData | null | undefined,
	newDemographics: DemographicsData
): boolean {
	return JSON.stringify(newDemographics) !== JSON.stringify(oldDemographics ?? {})
}

/**
 * Type-safe wrapper for updateProfileWithHistoryFn call signature.
 *
 * TanStack Start's createServerFn uses complex type inference that doesn't
 * fully propagate handler parameter/return types when the handler accepts
 * an object with multiple properties (data + expectedVersion). The framework
 * infers `unknown` for the combined parameter object.
 *
 * This explicit type alias provides the correct call signature until
 * TanStack Start improves type inference for multi-property handler params.
 * See: https://github.com/TanStack/router/discussions/2847
 */
type UpdateProfileFnType = (opts: {
	data: {displayName: string}
	expectedVersion?: number
}) => Promise<{
	success: boolean
	updatedFields: string[]
	newVersion: number
}>

/**
 * Type-safe wrapper for updateDemographicsWithHistoryFn call signature.
 * See UpdateProfileFnType JSDoc for detailed rationale.
 */
type UpdateDemographicsFnType = (opts: {
	data: DemographicsData
	expectedVersion?: number
}) => Promise<{
	success: boolean
	historyId?: string
	updatedFields: string[]
	newVersion: number
}>

export const Route = createFileRoute('/_authed/settings/profile')({
	loader: async (): Promise<{profile: FullProfileData}> => {
		const profileData = await getFullProfileFn()
		return {profile: profileData}
	},
	component: ProfileSettingsComponent
})

function ProfileSettingsComponent() {
	/**
	 * Type assertion required due to TanStack Start loader type inference gap.
	 * The loader return type is correctly typed above, but useLoaderData()
	 * doesn't infer it from the Route definition. This is a known limitation.
	 * See UpdateProfileFnType JSDoc for related framework type inference issues.
	 */
	const loaderData = Route.useLoaderData() as {profile: FullProfileData}
	const [profile, setProfile] = useState(loaderData.profile)
	const queryClient = useQueryClient()
	const router = useRouter()
	const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
	const [conflictRetryCount, setConflictRetryCount] = useState(0)
	const [conflictDialogLoading, setConflictDialogLoading] = useState(false)
	const [pendingSubmission, setPendingSubmission] = useState<{
		displayName: string
		demographics: DemographicsData
	} | null>(null)

	const updateProfileMutation = useMutation({
		mutationFn: async (data: {displayName: string; expectedVersion?: number}) => {
			return (updateProfileWithHistoryFn as unknown as UpdateProfileFnType)({
				data: {displayName: data.displayName},
				expectedVersion: data.expectedVersion
			})
		}
	})

	const updateDemographicsMutation = useMutation({
		mutationFn: async (data: {demographics: DemographicsData; expectedVersion?: number}) => {
			return (updateDemographicsWithHistoryFn as unknown as UpdateDemographicsFnType)({
				data: data.demographics,
				expectedVersion: data.expectedVersion
			})
		}
	})

	const handleSubmit = async (data: {displayName: string; demographics: DemographicsData}) => {
		try {
			const profileChanged = hasProfileChanged(profile.displayName, data.displayName)
			const demographicsChanged = hasDemographicsChanged(profile.demographics, data.demographics)

			if (!profileChanged && !demographicsChanged) {
				toast.info('No changes to save')
				return
			}

			let currentVersion = profile.version
			let newVersion = currentVersion

			// Run updates sequentially to ensure proper version tracking.
			// Parallel updates with same expectedVersion could cause race condition
			// where both use same version but second update should use incremented version.
			if (profileChanged) {
				const profileResult = await updateProfileMutation.mutateAsync({
					displayName: data.displayName,
					expectedVersion: currentVersion
				})
				newVersion = profileResult.newVersion
				currentVersion = newVersion // Use new version for next update
			}

			if (demographicsChanged) {
				const demographicsResult = await updateDemographicsMutation.mutateAsync({
					demographics: data.demographics,
					expectedVersion: currentVersion
				})
				newVersion = demographicsResult.newVersion
			}

			// Update local state with new version
			setProfile(prev => ({...prev, version: newVersion}))

			await queryClient.invalidateQueries({queryKey: ['profile']})

			toast.success('Profile updated')
		} catch (error) {
			// Check for ConflictError using error code instead of fragile message matching.
			// ConflictError instances have a 'code' property set to CONFLICT_ERROR_CODE.
			const isConflictError =
				error instanceof ConflictError ||
				(error instanceof Error &&
					'code' in error &&
					(error as Error & {code?: string}).code === CONFLICT_ERROR_CODE)

			if (isConflictError) {
				// Increment retry count and check limit
				const newRetryCount = conflictRetryCount + 1
				setConflictRetryCount(newRetryCount)

				if (newRetryCount >= MAX_CONFLICT_RETRIES) {
					toast.error('Multiple conflicts detected. Please refresh the page and try again.')
					return
				}

				// Show conflict dialog
				setPendingSubmission(data)
				setConflictDialogOpen(true)
				return
			}
			const message = error instanceof Error ? error.message : 'Failed to update profile'
			toast.error(message)
		}
	}

	const handleRefresh = async () => {
		setConflictDialogLoading(true)
		try {
			setPendingSubmission(null)
			// Invalidate and re-fetch via router
			await router.invalidate()
			const newData = await getFullProfileFn()
			setProfile(newData)
			// Reset retry count on refresh since user is starting fresh with latest data
			setConflictRetryCount(0)
			toast.info('Profile refreshed with latest data')
		} finally {
			setConflictDialogLoading(false)
			setConflictDialogOpen(false)
		}
	}

	const handleOverwrite = async () => {
		if (!pendingSubmission) return

		setConflictDialogLoading(true)

		try {
			// Re-fetch to get latest version, then overwrite
			const latestProfile = await getFullProfileFn()
			const profileChanged = hasProfileChanged(
				latestProfile.displayName,
				pendingSubmission.displayName
			)
			const demographicsChanged = hasDemographicsChanged(
				latestProfile.demographics,
				pendingSubmission.demographics
			)

			let currentVersion = latestProfile.version
			let newVersion = currentVersion

			// Run updates sequentially for proper version tracking
			if (profileChanged) {
				const profileResult = await updateProfileMutation.mutateAsync({
					displayName: pendingSubmission.displayName,
					expectedVersion: currentVersion
				})
				newVersion = profileResult.newVersion
				currentVersion = newVersion
			}

			if (demographicsChanged) {
				const demographicsResult = await updateDemographicsMutation.mutateAsync({
					demographics: pendingSubmission.demographics,
					expectedVersion: currentVersion
				})
				newVersion = demographicsResult.newVersion
			}

			if (!profileChanged && !demographicsChanged) {
				toast.info('No changes to save after refresh')
				setProfile(latestProfile)
				setPendingSubmission(null)
				return
			}

			setProfile(prev => ({
				...prev,
				displayName: pendingSubmission.displayName,
				demographics: pendingSubmission.demographics,
				version: newVersion
			}))

			await queryClient.invalidateQueries({queryKey: ['profile']})
			setConflictRetryCount(0) // Reset retry counter on successful overwrite
			toast.success('Profile updated (overwrote previous changes)')
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to update profile'
			toast.error(message)
		} finally {
			setConflictDialogLoading(false)
			setConflictDialogOpen(false)
			setPendingSubmission(null)
		}
	}

	return (
		<PageContainer>
			<div className='w-full max-w-2xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-3xl text-foreground'>Profile Settings</h1>
					<p className='text-muted-foreground'>Update your profile and demographic information</p>
				</div>

				<FormContainer>
					<ProfileSettingsForm
						initialData={{
							displayName: profile.displayName ?? '',
							dateOfBirth: profile.dateOfBirth ?? '',
							demographics: profile.demographics
						}}
						onSubmit={handleSubmit}
						submitting={updateProfileMutation.isPending || updateDemographicsMutation.isPending}
					/>
				</FormContainer>
			</div>

			<Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Profile Updated Elsewhere</DialogTitle>
						<DialogDescription>
							Your profile was modified in another session or browser tab. What would you like to
							do?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className='gap-2 sm:gap-0'>
						<Button
							data-testid='conflict-dialog-refresh'
							disabled={conflictDialogLoading}
							variant='outline'
							onClick={handleRefresh}
						>
							{conflictDialogLoading ? 'Loading...' : 'Refresh (discard my changes)'}
						</Button>
						<Button
							data-testid='conflict-dialog-overwrite'
							disabled={conflictDialogLoading}
							onClick={handleOverwrite}
						>
							{conflictDialogLoading ? 'Saving...' : 'Overwrite with my changes'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</PageContainer>
	)
}
