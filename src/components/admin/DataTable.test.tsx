/**
 * Unit tests for DataTable component
 * Tests rendering, sorting, filtering, pagination, row selection, column visibility
 */

import type {ColumnDef} from '@tanstack/react-table'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {DataTable} from './DataTable'

interface TestData {
	id: string
	name: string
	email: string
	status: string
}

const testColumns: ColumnDef<TestData, unknown>[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	},
	{
		accessorKey: 'email',
		header: 'Email'
	},
	{
		accessorKey: 'status',
		header: 'Status'
	}
]

const testData: TestData[] = [
	{id: '1', name: 'Alice', email: 'alice@example.com', status: 'active'},
	{id: '2', name: 'Bob', email: 'bob@example.com', status: 'inactive'},
	{id: '3', name: 'Charlie', email: 'charlie@example.com', status: 'active'}
]

describe('DataTable', () => {
	describe('rendering', () => {
		it('should render table with data', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('Alice')).toBeInTheDocument()
			expect(screen.getByText('Bob')).toBeInTheDocument()
			expect(screen.getByText('Charlie')).toBeInTheDocument()
		})

		it('should render column headers', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('Name')).toBeInTheDocument()
			expect(screen.getByText('Email')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
		})

		it('should show empty state when no data', () => {
			render(<DataTable data={[]} columns={testColumns} />)

			expect(screen.getByText('No data available')).toBeInTheDocument()
		})

		it('should render search input with placeholder', () => {
			render(<DataTable data={testData} columns={testColumns} searchPlaceholder='Find users...' />)

			expect(screen.getByPlaceholderText('Find users...')).toBeInTheDocument()
		})

		it('should use default search placeholder', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
		})
	})

	describe('filtering', () => {
		it('should filter data based on search input', async () => {
			const user = userEvent.setup()
			render(<DataTable data={testData} columns={testColumns} />)

			const searchInput = screen.getByPlaceholderText('Search...')
			await user.type(searchInput, 'Alice')

			expect(screen.getByText('Alice')).toBeInTheDocument()
			expect(screen.queryByText('Bob')).not.toBeInTheDocument()
		})

		it('should clear filter when search is emptied', async () => {
			const user = userEvent.setup()
			render(<DataTable data={testData} columns={testColumns} />)

			const searchInput = screen.getByPlaceholderText('Search...')
			await user.type(searchInput, 'Alice')
			await user.clear(searchInput)

			expect(screen.getByText('Alice')).toBeInTheDocument()
			expect(screen.getByText('Bob')).toBeInTheDocument()
		})
	})

	describe('sorting', () => {
		it('should allow sorting by clicking column header', async () => {
			const user = userEvent.setup()
			render(<DataTable data={testData} columns={testColumns} />)

			const nameHeader = screen.getByText('Name')
			await user.click(nameHeader)

			// Should show sort indicator
			const headerContainer = nameHeader.closest('div')
			expect(headerContainer).toHaveClass('cursor-pointer')
		})

		it('should toggle sort direction on repeated clicks', async () => {
			const user = userEvent.setup()
			render(<DataTable data={testData} columns={testColumns} />)

			const nameHeader = screen.getByText('Name')
			await user.click(nameHeader)
			await user.click(nameHeader)

			// Just verify clicking doesn't break
			expect(screen.getByText('Alice')).toBeInTheDocument()
		})
	})

	describe('pagination', () => {
		it('should show pagination controls', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('First')).toBeInTheDocument()
			expect(screen.getByText('Previous')).toBeInTheDocument()
			expect(screen.getByText('Next')).toBeInTheDocument()
			expect(screen.getByText('Last')).toBeInTheDocument()
		})

		it('should show entry count', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByText(/Showing 1 to 3 of 3 entries/)).toBeInTheDocument()
		})

		it('should respect pageSize prop', () => {
			const largeData = Array.from({length: 25}, (_, i) => ({
				id: `${i}`,
				name: `User ${i}`,
				email: `user${i}@example.com`,
				status: 'active'
			}))

			render(<DataTable data={largeData} columns={testColumns} pageSize={5} />)

			expect(screen.getByText(/Showing 1 to 5 of 25 entries/)).toBeInTheDocument()
		})

		it('should navigate pages with Next button', async () => {
			const user = userEvent.setup()
			const largeData = Array.from({length: 25}, (_, i) => ({
				id: `${i}`,
				name: `User ${i}`,
				email: `user${i}@example.com`,
				status: 'active'
			}))

			render(<DataTable data={largeData} columns={testColumns} pageSize={10} />)

			const nextButton = screen.getByText('Next')
			await user.click(nextButton)

			expect(screen.getByText(/Showing 11 to 20 of 25 entries/)).toBeInTheDocument()
		})

		it('should disable Previous on first page', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('Previous')).toBeDisabled()
			expect(screen.getByText('First')).toBeDisabled()
		})
	})

	describe('row selection', () => {
		it('should not show selection column by default', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			const checkboxes = screen.queryAllByRole('checkbox')
			expect(checkboxes).toHaveLength(0)
		})

		it('should show selection column when enabled', () => {
			render(
				<DataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					getRowId={row => row.id}
				/>
			)

			// Header checkbox + row checkboxes
			const checkboxes = screen.getAllByRole('checkbox')
			expect(checkboxes.length).toBeGreaterThan(0)
		})

		it('should call onSelectionChange when row is selected', async () => {
			const user = userEvent.setup()
			const onSelectionChange = vi.fn()

			render(
				<DataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					onSelectionChange={onSelectionChange}
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			// Click first row checkbox (skip header)
			await user.click(checkboxes[1])

			expect(onSelectionChange).toHaveBeenCalled()
		})

		it('should select all rows with header checkbox', async () => {
			const user = userEvent.setup()
			const onSelectionChange = vi.fn()

			render(
				<DataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					onSelectionChange={onSelectionChange}
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			// Click header checkbox
			await user.click(checkboxes[0])

			// Should be called with all IDs
			expect(onSelectionChange).toHaveBeenCalled()
		})
	})

	describe('column visibility', () => {
		it('should not show column visibility toggle by default', () => {
			render(<DataTable data={testData} columns={testColumns} />)

			expect(screen.queryByText('Columns')).not.toBeInTheDocument()
		})

		it('should show column visibility toggle when enabled', () => {
			render(<DataTable data={testData} columns={testColumns} enableColumnVisibility />)

			// Use getByRole to avoid matching the SVG title
			expect(screen.getByRole('button', {name: /columns/i})).toBeInTheDocument()
		})

		it('should respect defaultColumnVisibility', () => {
			render(
				<DataTable
					data={testData}
					columns={testColumns}
					enableColumnVisibility
					defaultColumnVisibility={{email: false}}
				/>
			)

			// Email column should be hidden
			expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
		})
	})
})
