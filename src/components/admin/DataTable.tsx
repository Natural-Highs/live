import {rankItem} from '@tanstack/match-sorter-utils'
import {
	type ColumnDef,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import {useState} from 'react'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
	const itemRank = rankItem(row.getValue(columnId), value)
	addMeta({itemRank})
	return itemRank.passed
}

interface DataTableProps<TData> {
	data: TData[]
	columns: ColumnDef<TData, any>[]
	searchPlaceholder?: string
	pageSize?: number
}

export function DataTable<TData>({
	data,
	columns,
	searchPlaceholder = 'Search...',
	pageSize = 10
}: DataTableProps<TData>) {
	const [globalFilter, setGlobalFilter] = useState('')

	const table = useReactTable({
		data,
		columns,
		filterFns: {
			fuzzy: fuzzyFilter
		},
		state: {
			globalFilter
		},
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: fuzzyFilter,
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
			{/* Search Input */}
			<div className='form-control'>
				<input
					className='input input-bordered w-full max-w-xs'
					onChange={e => setGlobalFilter(e.target.value)}
					placeholder={searchPlaceholder}
					type='text'
					value={globalFilter}
				/>
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
								<td className='text-center' colSpan={columns.length}>
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
