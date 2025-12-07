import {rankItem} from '@tanstack/match-sorter-utils'
import {
	type ColumnDef,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type RowSelectionState,
	useReactTable,
	type VisibilityState
} from '@tanstack/react-table'
import {useVirtualizer} from '@tanstack/react-virtual'
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
	enableRowSelection?: boolean
	onSelectionChange?: (selectedIds: string[]) => void
	getRowId?: (row: TData) => string
	enableColumnVisibility?: boolean
	defaultColumnVisibility?: Record<string, boolean>
}

export function VirtualDataTable<TData>({
	data,
	columns,
	searchPlaceholder = 'Search...',
	enableRowSelection = false,
	onSelectionChange,
	getRowId,
	enableColumnVisibility = false,
	defaultColumnVisibility = {}
}: DataTableProps<TData>) {
	const tableContainerRef = useRef<HTMLDivElement>(null)
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
				checked={table.getIsAllRowsSelected()}
				indeterminate={table.getIsSomeRowsSelected()}
				onChange={table.getToggleAllRowsSelectedHandler()}
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
		getSortedRowModel: getSortedRowModel()
	})

	const {rows} = table.getRowModel()

	// Virtual scrolling setup
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 48,
		overscan: 10
	})

	const virtualRows = rowVirtualizer.getVirtualItems()
	const totalSize = rowVirtualizer.getTotalSize()

	// Padding for virtual scroll positioning
	const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
	const paddingBottom =
		virtualRows.length > 0
			? // biome-ignore lint/style/useAtIndex: TypeScript doesn't recognize .at() with current lib config
				totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
			: 0

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

			{/* Virtual scrolling container */}
			<div
				className='h-[600px] overflow-auto rounded-lg border border-base-300'
				ref={tableContainerRef}
			>
				<table className='table-zebra table w-full'>
					<thead className='sticky top-0 z-10 bg-base-200'>
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
						{paddingTop > 0 && (
							<tr>
								<td style={{height: paddingTop}} />
							</tr>
						)}
						{rows.length === 0 ? (
							<tr>
								<td className='text-center' colSpan={allColumns.length}>
									No data available
								</td>
							</tr>
						) : (
							virtualRows.map(virtualRow => {
								const row = rows[virtualRow.index]
								return (
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
								)
							})
						)}
						{paddingBottom > 0 && (
							<tr>
								<td style={{height: paddingBottom}} />
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Row count */}
			<div className='text-base-content/70 text-sm'>
				{rows.length} total rows
				{enableRowSelection && Object.keys(rowSelection).length > 0 && (
					<span>
						{' '}
						({Object.keys(rowSelection).filter(k => rowSelection[k]).length}{' '}
						selected)
					</span>
				)}
			</div>
		</div>
	)
}
