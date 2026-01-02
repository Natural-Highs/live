import type {ColumnDef} from '@tanstack/react-table'
import {useMemo} from 'react'
import {DataTable} from '@/components/admin/DataTable'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Spinner} from '@/components/ui/spinner'

/**
 * Guest data structure for admin guest list
 */
export interface GuestListItem {
	id: string
	firstName: string
	lastName: string
	email: string | null
	checkInTime: string | null
}

interface AdminGuestListProps {
	guests: GuestListItem[]
	isLoading: boolean
	onAddEmail: (guest: GuestListItem) => void
}

/**
 * Format date string to locale string
 * Uses explicit locale to prevent SSR/client hydration mismatches
 */
const formatDateTime = (dateStr: string): string => {
	const date = new Date(dateStr)
	return date.toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short'
	})
}

/**
 * AdminGuestList component for displaying live check-in list for admins
 *
 * Features:
 * - Displays guest name, email status, and check-in time
 * - Shows "Missing Email" badge for guests without email
 * - Provides "Add Email" action button for guests without email
 * - Responsive: full-width on mobile, table layout on desktop
 */
export function AdminGuestList({guests, isLoading, onAddEmail}: AdminGuestListProps) {
	const columns = useMemo<ColumnDef<GuestListItem>[]>(
		() => [
			{
				accessorKey: 'name',
				header: 'Name',
				cell: ({row}) => {
					const guest = row.original
					return `${guest.firstName} ${guest.lastName}`
				}
			},
			{
				accessorKey: 'email',
				header: 'Email',
				cell: ({row}) => {
					const guest = row.original
					if (guest.email) {
						return <span>{guest.email}</span>
					}
					return (
						<Badge variant='warning' data-testid={`missing-email-badge-${guest.id}`}>
							Missing Email
						</Badge>
					)
				}
			},
			{
				accessorKey: 'checkInTime',
				header: 'Check-in Time',
				cell: ({row}) => (row.original.checkInTime ? formatDateTime(row.original.checkInTime) : '—')
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({row}) => {
					const guest = row.original
					if (guest.email) {
						return null
					}
					return (
						<Button
							size='sm'
							variant='outline'
							data-testid={`add-email-button-${guest.id}`}
							onClick={() => onAddEmail(guest)}
							type='button'
						>
							Add Email
						</Button>
					)
				}
			}
		],
		[onAddEmail]
	)

	if (isLoading) {
		return (
			<div className='flex items-center justify-center p-8' data-testid='admin-guest-list-loading'>
				<Spinner size='lg' />
			</div>
		)
	}

	if (guests.length === 0) {
		return (
			<div
				className='rounded-lg bg-blue-500/15 p-4 text-blue-700 dark:text-blue-300'
				data-testid='admin-guest-list-empty'
			>
				<span>No guests checked in for this event yet.</span>
			</div>
		)
	}

	return (
		<div data-testid='admin-guest-list'>
			<DataTable columns={columns} data={guests} searchPlaceholder='Search guests...' />
		</div>
	)
}
