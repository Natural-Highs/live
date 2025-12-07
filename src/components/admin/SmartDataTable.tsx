import type {ColumnDef} from '@tanstack/react-table'
import {DataTable} from './DataTable'
import {VirtualDataTable} from './VirtualDataTable'

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

const VIRTUALIZATION_THRESHOLD = 500

export function SmartDataTable<TData>(props: DataTableProps<TData>) {
	if (props.data.length >= VIRTUALIZATION_THRESHOLD) {
		return <VirtualDataTable {...props} />
	}
	return <DataTable {...props} />
}
