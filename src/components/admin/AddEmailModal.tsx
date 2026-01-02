import {useEffect, useState} from 'react'
import {Button} from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {linkGuestToUser, updateGuestEmail} from '@/server/functions/guests'
import type {GuestListItem} from './AdminGuestList'

interface AddEmailModalProps {
	guest: GuestListItem | null
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void | Promise<void>
}

type ModalState =
	| {type: 'input'}
	| {type: 'duplicateUser'; existingId: string}
	| {type: 'duplicateGuest'; existingId: string}
	| {type: 'linking'}
	| {type: 'success'}

/**
 * Modal for adding email to a guest record
 *
 * Handles:
 * - Email input and validation
 * - Duplicate detection (user or guest with same email)
 * - Option to link guest to existing user
 */
export function AddEmailModal({guest, isOpen, onClose, onSuccess}: AddEmailModalProps) {
	const [email, setEmail] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [modalState, setModalState] = useState<ModalState>({type: 'input'})

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setEmail('')
			setError(null)
			setIsSubmitting(false)
			setModalState({type: 'input'})
		}
	}, [isOpen])

	if (!guest || !isOpen) {
		return null
	}

	const validateEmail = (value: string): boolean => {
		if (!value.trim()) {
			setError('Email is required')
			return false
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(value)) {
			setError('Please enter a valid email address')
			return false
		}
		return true
	}

	const handleSubmit = async () => {
		setError(null)

		if (!validateEmail(email)) {
			return
		}

		setIsSubmitting(true)

		try {
			const result = await updateGuestEmail({
				data: {guestId: guest.id, email: email.toLowerCase().trim()}
			})

			if ('found' in result && result.found) {
				if (result.existingType === 'user') {
					setModalState({type: 'duplicateUser', existingId: result.existingId})
				} else {
					setModalState({type: 'duplicateGuest', existingId: result.existingId})
				}
			} else if ('success' in result && result.success) {
				setModalState({type: 'success'})
				try {
					await Promise.resolve(onSuccess())
				} catch (successErr) {
					console.error('[AddEmailModal] onSuccess callback failed:', successErr)
				}
				onClose()
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update email')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleLinkUser = async () => {
		if (modalState.type !== 'duplicateUser') {
			return
		}

		setIsSubmitting(true)
		setModalState({type: 'linking'})

		try {
			await linkGuestToUser({
				data: {guestId: guest.id, targetUserId: modalState.existingId}
			})
			setModalState({type: 'success'})
			try {
				await Promise.resolve(onSuccess())
			} catch (successErr) {
				console.error('[AddEmailModal] onSuccess callback failed:', successErr)
			}
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to link guest to user')
			setModalState({type: 'input'})
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCancel = () => {
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent data-testid='add-email-modal'>
				<DialogHeader>
					<DialogTitle>
						Add Email for {guest.firstName} {guest.lastName}
					</DialogTitle>
					<DialogDescription>
						Enter an email address for this guest to enable future communications.
					</DialogDescription>
				</DialogHeader>

				{modalState.type === 'input' && (
					<div className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='guest-email'>Email Address</Label>
							<Input
								id='guest-email'
								type='email'
								data-testid='email-input'
								value={email}
								onChange={e => {
									setEmail(e.target.value)
									setError(null)
								}}
								placeholder='guest@example.com'
								disabled={isSubmitting}
							/>
							{error && (
								<p className='text-destructive text-sm' data-testid='email-error'>
									{error}
								</p>
							)}
						</div>

						<DialogFooter>
							<Button
								variant='outline'
								onClick={handleCancel}
								disabled={isSubmitting}
								data-testid='cancel-email-button'
								type='button'
							>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={isSubmitting}
								data-testid='submit-email-button'
								type='button'
							>
								{isSubmitting ? 'Saving...' : 'Save Email'}
							</Button>
						</DialogFooter>
					</div>
				)}

				{modalState.type === 'duplicateUser' && (
					<div className='space-y-4'>
						<div
							className='rounded-lg bg-yellow-500/15 p-4 text-yellow-700 dark:text-yellow-300'
							data-testid='duplicate-user-warning'
						>
							<p className='font-medium'>Email already registered</p>
							<p className='mt-1 text-sm'>
								This email is already associated with a registered user account. Would you like to
								link this guest's event history to that user?
							</p>
						</div>

						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setModalState({type: 'input'})}
								disabled={isSubmitting}
								type='button'
							>
								Use Different Email
							</Button>
							<Button
								onClick={handleLinkUser}
								disabled={isSubmitting}
								data-testid='link-user-button'
								type='button'
							>
								{isSubmitting ? 'Linking...' : 'Link to User'}
							</Button>
						</DialogFooter>
					</div>
				)}

				{modalState.type === 'duplicateGuest' && (
					<div className='space-y-4'>
						<div
							className='rounded-lg bg-orange-500/15 p-4 text-orange-700 dark:text-orange-300'
							data-testid='duplicate-guest-warning'
						>
							<p className='font-medium'>Email already in use</p>
							<p className='mt-1 text-sm'>
								This email is already associated with another guest record. Please use a different
								email address.
							</p>
						</div>

						<DialogFooter>
							<Button
								variant='outline'
								onClick={() => setModalState({type: 'input'})}
								type='button'
							>
								Use Different Email
							</Button>
						</DialogFooter>
					</div>
				)}

				{modalState.type === 'linking' && (
					<div className='flex items-center justify-center py-8'>
						<p className='text-muted-foreground'>Linking guest to user account...</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
