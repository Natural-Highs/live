import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type {ColumnDef} from '@tanstack/react-table'
import {useMemo, useState} from 'react'
import {type User, usersQueryOptions} from '@/lib/queries/index.js'
import {DataTable} from '../../components/admin/DataTable'

export const Route = createFileRoute('/_admin/users')({
	loader: async ({context}) => {
		await context.queryClient.prefetchQuery(usersQueryOptions())
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

	const handleViewDetails = (user: User) => {
		setSelectedUser(user)
		setShowDetailsModal(true)
	}

	const handleToggleAdminClick = (user: User) => {
		setSelectedUser(user)
		setShowToggleAdminModal(true)
	}

	const handleToggleAdmin = async () => {
		if (!selectedUser) return

		setError('')

		try {
			const response = await fetch(
				`/api/admin/users/${selectedUser.id}/admin`,
				{
					method: 'PATCH',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({
						admin: !selectedUser.admin
					})
				}
			)

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
			setError(
				err instanceof Error ? err.message : 'Failed to update admin status'
			)
		}
	}

	const formatDate = (date: Date | string | {toDate: () => Date}): string => {
		let d: Date
		if (date instanceof Date) {
			d = date
		} else if (typeof date === 'object' && date !== null && 'toDate' in date) {
			d = (date as {toDate: () => Date}).toDate()
		} else {
			d = new Date(date as string)
		}
		return d.toLocaleString()
	}

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
						<span className='badge badge-primary'>Admin</span>
					) : (
						<span className='badge badge-ghost'>User</span>
					)
			},
			{
				accessorKey: 'signedConsentForm',
				header: 'Consent',
				cell: ({row}) =>
					row.original.signedConsentForm ? (
						<span className='badge badge-success'>Signed</span>
					) : (
						<span className='badge badge-warning'>Not Signed</span>
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
						<button
							className='btn btn-sm btn-primary'
							onClick={() => handleViewDetails(row.original)}
							type='button'
						>
							View Details
						</button>
						<button
							className='btn btn-sm btn-secondary'
							onClick={() => handleToggleAdminClick(row.original)}
							type='button'
						>
							{row.original.admin ? 'Remove Admin' : 'Make Admin'}
						</button>
					</div>
				)
			}
		],
		[]
	)

	if (isLoading) {
		return (
			<div className='container mx-auto p-4'>
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<h1 className='mb-4 font-bold text-2xl'>User Management</h1>

			{/* Error Message */}
			{error && (
				<div className='alert alert-error mb-4'>
					<span>{error}</span>
				</div>
			)}

			{/* Users Table */}
			<div className='card bg-base-200 shadow-xl'>
				<div className='card-body'>
					<h2 className='card-title'>Users ({users.length})</h2>
					{users.length === 0 ? (
						<p className='py-8 text-center'>No users found</p>
					) : (
						<DataTable
							columns={userColumns}
							data={users}
							searchPlaceholder='Search users...'
						/>
					)}
				</div>
			</div>

			{/* Details Modal */}
			{showDetailsModal && selectedUser && (
				<div className='modal modal-open'>
					<div className='modal-box'>
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
								<span
									className={`badge ${
										selectedUser.admin ? 'badge-primary' : 'badge-ghost'
									}`}
								>
									{selectedUser.admin ? 'Yes' : 'No'}
								</span>
							</p>
							<p>
								<strong>Consent Form:</strong>{' '}
								<span
									className={`badge ${
										selectedUser.signedConsentForm
											? 'badge-success'
											: 'badge-warning'
									}`}
								>
									{selectedUser.signedConsentForm ? 'Signed' : 'Not Signed'}
								</span>
							</p>
							<p>
								<strong>Created At:</strong>{' '}
								{formatDate(selectedUser.createdAt)}
							</p>
						</div>
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => setShowDetailsModal(false)}
								type='button'
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toggle Admin Modal */}
			{showToggleAdminModal && selectedUser && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>
							{selectedUser.admin
								? 'Remove Admin Rights'
								: 'Grant Admin Rights'}
						</h3>
						<p className='mb-4'>
							Are you sure you want to{' '}
							{selectedUser.admin
								? 'remove admin rights from'
								: 'grant admin rights to'}{' '}
							<strong>{selectedUser.email}</strong>?
						</p>
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => {
									setShowToggleAdminModal(false)
									setSelectedUser(null)
								}}
								type='button'
							>
								Cancel
							</button>
							<button
								className={`btn ${selectedUser.admin ? 'btn-warning' : 'btn-primary'}`}
								onClick={handleToggleAdmin}
								type='button'
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
