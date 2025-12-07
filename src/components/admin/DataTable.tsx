import {rankItem} from '@tanstack/match-sorter-utils'
import {
	type ColumnDef,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import {type JSX, useEffect, useRef, useState} from 'react'

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
	const itemRank = rankItem(row.getValue(columnId), value)
	addMeta({itemRank})
	return itemRank.passed
}

interface IndeterminateCheckboxProps {
	checked: boolean
	indeterminate: boolean
	onChange: (event: unknown) => void
}

function IndeterminateCheckbox({
	checked,
	indeterminate,
	onChange
}: IndeterminateCheckboxProps): JSX.Element {
	const ref = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = indeterminate
		}
	}, [indeterminate])

	return (
		<input
			checked={checked}
			className='checkbox checkbox-sm'
			onChange={onChange}
			ref={ref}
			type='checkbox'
		/>
	)
}

interface DataTableProps<TData> {
	data: TData[]
	columns: ColumnDef<TData, unknown>[]
	searchPlaceholder?: string
	pageSize?: number
	// Row selection
	enableRowSelection?: boolean
	onSelectionChange?: (selectedIds: string[]) => void
	getRowId?: (row: TData) => string
	// Column visibility
	enableColumnVisibility?: boolean
	defaultColumnVisibility?: Record<string, boolean>
}

export function DataTable<TData>({
	data,
	columns,
	searchPlaceholder = 'Search...',
	pageSize = 10,
	enableRowSelection = false,
	onSelectionChange,
	getRowId,
	enableColumnVisibility = false,
	defaultColumnVisibility = {}
}: DataTableProps<TData>) {
	const [globalFilter, setGlobalFilter] = useState('')
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		defaultColumnVisibility
	)

	// Notify parent of selection changes
	useEffect(() => {
		if (onSelectionChange && enableRowSelection) {
			const selectedIds = Object.keys(rowSelection).filter(
				id => rowSelection[id]
			)
			onSelectionChange(selectedIds)
		}
	}, [rowSelection, onSelectionChange, enableRowSelection])

	// Add selection column if enabled
	const selectionColumn: ColumnDef<TData, unknown> = {
		id: 'select',
		header: ({table}) => (
			<IndeterminateCheckbox
				checked={table.getIsAllPageRowsSelected()}
				indeterminate={table.getIsSomePageRowsSelected()}
				onChange={table.getToggleAllPageRowsSelectedHandler()}
			/>
		),
		cell: ({row}) => (
			<input
				checked={row.getIsSelected()}
				className='checkbox checkbox-sm'
				disabled={!row.getCanSelect()}
				onChange={row.getToggleSelectedHandler()}
				type='checkbox'
			/>
		)
	}

	const allColumns = enableRowSelection
		? [selectionColumn, ...columns]
		: columns

	const table = useReactTable({
		data,
		columns: allColumns,
		filterFns: {
			fuzzy: fuzzyFilter as FilterFn<TData>
		},
		state: {
			globalFilter,
			rowSelection,
			columnVisibility
		},
		onGlobalFilterChange: setGlobalFilter,
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange: setColumnVisibility,
		enableRowSelection,
		getRowId,
		globalFilterFn: fuzzyFilter as FilterFn<TData>,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize
			}
		}
	})

	return (
		<div className='space-y-4'>
			{/* Controls */}
			<div className='flex items-center gap-4'>
				{/* Search Input */}
				<div className='form-control flex-1'>
					<input
						className='input input-bordered w-full max-w-xs'
						onChange={e => setGlobalFilter(e.target.value)}
						placeholder={searchPlaceholder}
						type='text'
						value={globalFilter}
					/>
				</div>

				{/* Column Visibility Toggle */}
				{enableColumnVisibility && (
					<div className='dropdown dropdown-end'>
						<button className='btn btn-ghost btn-sm gap-1' type='button'>
							<svg
								className='h-4 w-4'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<title>Columns</title>
								<path
									d='M4 6h16M4 12h16M4 18h16'
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
								/>
							</svg>
							Columns
						</button>
						<ul className='menu dropdown-content z-10 w-52 rounded-box bg-base-100 p-2 shadow'>
							{table
								.getAllLeafColumns()
								.filter(column => column.id !== 'select')
								.map(column => (
									<li key={column.id}>
										<label className='flex cursor-pointer items-center gap-2'>
											<input
												checked={column.getIsVisible()}
												className='checkbox checkbox-sm'
												onChange={column.getToggleVisibilityHandler()}
												type='checkbox'
											/>
											<span className='capitalize'>{column.id}</span>
										</label>
									</li>
								))}
						</ul>
					</div>
				)}
			</div>

			{/* Table */}
			<div className='overflow-x-auto'>
				<table className='table-zebra table w-full'>
					<thead>
						{table.getHeaderGroups().map(headerGroup => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<th key={header.id}>
										{header.isPlaceholder ? null : (
											<div
												{...{
													className: header.column.getCanSort()
														? 'cursor-pointer select-none flex items-center gap-2'
														: '',
													onClick: header.column.getToggleSortingHandler()
												}}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
												{{
													asc: ' ↑',
													desc: ' ↓'
												}[header.column.getIsSorted() as string] ?? null}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.length === 0 ? (
							<tr>
								<td className='text-center' colSpan={allColumns.length}>
									No data available
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map(row => (
								<tr key={row.id}>
									{row.getVisibleCells().map(cell => (
										<td key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			<div className='flex items-center justify-between'>
				<div className='text-sm'>
					Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
					{Math.min(
						(table.getState().pagination.pageIndex + 1) * pageSize,
						table.getFilteredRowModel().rows.length
					)}{' '}
					of {table.getFilteredRowModel().rows.length} entries
				</div>
				<div className='join'>
					<button
						className='btn join-item btn-sm'
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.setPageIndex(0)}
						type='button'
					>
						First
					</button>
					<button
						className='btn join-item btn-sm'
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
						type='button'
					>
						Previous
					</button>
					<button className='btn join-item btn-sm' type='button'>
						Page {table.getState().pagination.pageIndex + 1} of{' '}
						{table.getPageCount()}
					</button>
					<button
						className='btn join-item btn-sm'
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
						type='button'
					>
						Next
					</button>
					<button
						className='btn join-item btn-sm'
						disabled={!table.getCanNextPage()}
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						type='button'
					>
						Last
					</button>
				</div>
			</div>
		</div>
	)
}
