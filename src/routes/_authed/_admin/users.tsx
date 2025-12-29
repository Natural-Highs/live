import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type {ColumnDef} from '@tanstack/react-table'
import {useCallback, useMemo, useState} from 'react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Spinner} from '@/components/ui/spinner'
import {type User, usersQueryOptions} from '@/queries/index.js'
import {DataTable} from '@/components/admin/DataTable'

export const Route = createFileRoute('/_authed/_admin/users')({
	loader: async ({context}) => {
		// Prefetch users data - catch errors to allow client-side retry
		await context.queryClient.prefetchQuery(usersQueryOptions()).catch(() => {})
	},
	component: UsersPage
})

function UsersPage() {
	const queryClient = useQueryClient()
	const {data: users = [], isLoading} = useQuery(usersQueryOptions())
	const [error, setError] = useState('')
	const [selectedUser, setSelectedUser] = useState<User | null>(null)
	const [showDetailsModal, setShowDetailsModal] = useState(false)
	const [showToggleAdminModal, setShowToggleAdminModal] = useState(false)

	const handleViewDetails = useCallback((user: User) => {
		setSelectedUser(user)
		setShowDetailsModal(true)
	}, [])

	const handleToggleAdminClick = useCallback((user: User) => {
		setSelectedUser(user)
		setShowToggleAdminModal(true)
	}, [])

	const handleToggleAdmin = async () => {
		if (!selectedUser) return

		setError('')

		try {
			const response = await fetch(`/api/admin/users/${selectedUser.id}/admin`, {
				method: 'PATCH',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					admin: !selectedUser.admin
				})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to update admin status')
				return
			}

			setShowToggleAdminModal(false)
			setSelectedUser(null)
			await queryClient.invalidateQueries({queryKey: ['users']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update admin status')
		}
	}

	const formatDate = useCallback((date: Date | string | {toDate: () => Date}): string => {
		let d: Date
		if (date instanceof Date) {
			d = date
		} else if (typeof date === 'object' && date !== null && 'toDate' in date) {
			d = (date as {toDate: () => Date}).toDate()
		} else {
			d = new Date(date as string)
		}
		return d.toLocaleString()
	}, [])

	// Define columns for users table
	const userColumns = useMemo<ColumnDef<User>[]>(
		() => [
			{
				accessorKey: 'email',
				header: 'Email'
			},
			{
				accessorKey: 'firstName',
				header: 'First Name',
				cell: ({row}) => row.original.firstName || 'N/A'
			},
			{
				accessorKey: 'lastName',
				header: 'Last Name',
				cell: ({row}) => row.original.lastName || 'N/A'
			},
			{
				accessorKey: 'admin',
				header: 'Admin',
				cell: ({row}) =>
					row.original.admin ? (
						<Badge variant='default'>Admin</Badge>
					) : (
						<Badge variant='ghost'>User</Badge>
					)
			},
			{
				accessorKey: 'signedConsentForm',
				header: 'Consent',
				cell: ({row}) =>
					row.original.signedConsentForm ? (
						<Badge variant='success'>Signed</Badge>
					) : (
						<Badge variant='warning'>Not Signed</Badge>
					)
			},
			{
				accessorKey: 'createdAt',
				header: 'Created At',
				cell: ({row}) => formatDate(row.original.createdAt)
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({row}) => (
					<div className='flex gap-2'>
						<Button
							size='sm'
							variant='default'
							data-testid='button-view-details'
							onClick={() => handleViewDetails(row.original)}
							type='button'
						>
							View Details
						</Button>
						<Button
							size='sm'
							variant='secondary'
							data-testid='button-toggle-admin'
							onClick={() => handleToggleAdminClick(row.original)}
							type='button'
						>
							{row.original.admin ? 'Remove Admin' : 'Make Admin'}
						</Button>
					</div>
				)
			}
		],
		[formatDate, handleToggleAdminClick, handleViewDetails]
	)

	if (isLoading) {
		return (
			<div className='container mx-auto p-4'>
				<Spinner size='lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<h1 className='mb-4 font-bold text-2xl'>User Management</h1>

			{/* Error Message */}
			{error && (
				<div className='mb-4 rounded-lg bg-destructive/15 p-4 text-destructive'>
					<span>{error}</span>
				</div>
			)}

			{/* Users Table */}
			<Card className='shadow-xl'>
				<CardContent className='pt-6'>
					<h2 className='card-title'>Users ({users.length})</h2>
					{users.length === 0 ? (
						<p className='py-8 text-center'>No users found</p>
					) : (
						<DataTable columns={userColumns} data={users} searchPlaceholder='Search users...' />
					)}
				</CardContent>
			</Card>

			{/* Details Modal */}
			{showDetailsModal && selectedUser && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='mx-4 max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>User Details</h3>
						<div className='space-y-2'>
							<p>
								<strong>User ID:</strong> {selectedUser.id}
							</p>
							<p>
								<strong>Email:</strong> {selectedUser.email}
							</p>
							<p>
								<strong>First Name:</strong> {selectedUser.firstName || 'N/A'}
							</p>
							<p>
								<strong>Last Name:</strong> {selectedUser.lastName || 'N/A'}
							</p>
							<p>
								<strong>Admin:</strong>{' '}
								<Badge variant={selectedUser.admin ? 'default' : 'ghost'}>
									{selectedUser.admin ? 'Yes' : 'No'}
								</Badge>
							</p>
							<p>
								<strong>Consent Form:</strong>{' '}
								<Badge variant={selectedUser.signedConsentForm ? 'success' : 'warning'}>
									{selectedUser.signedConsentForm ? 'Signed' : 'Not Signed'}
								</Badge>
							</p>
							<p>
								<strong>Created At:</strong> {formatDate(selectedUser.createdAt)}
							</p>
						</div>
						<div className='mt-6 flex justify-end'>
							<Button variant='outline' onClick={() => setShowDetailsModal(false)} type='button'>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Toggle Admin Modal */}
			{showToggleAdminModal && selectedUser && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='mx-4 max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>
							{selectedUser.admin ? 'Remove Admin Rights' : 'Grant Admin Rights'}
						</h3>
						<p className='mb-4'>
							Are you sure you want to{' '}
							{selectedUser.admin ? 'remove admin rights from' : 'grant admin rights to'}{' '}
							<strong>{selectedUser.email}</strong>?
						</p>
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => {
									setShowToggleAdminModal(false)
									setSelectedUser(null)
								}}
								type='button'
							>
								Cancel
							</Button>
							<Button
								variant={selectedUser.admin ? 'destructive' : 'default'}
								data-testid='button-confirm-toggle-admin'
								onClick={handleToggleAdmin}
								type='button'
							>
								Confirm
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
