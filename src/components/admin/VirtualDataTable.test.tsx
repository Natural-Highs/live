/**
 * Unit tests for VirtualDataTable component
 * Tests rendering, sorting, filtering, row selection, column visibility
 *
 * Note: Virtual scrolling behavior cannot be fully tested in JSDOM because
 * @tanstack/react-virtual requires real DOM dimensions to calculate visible rows.
 * These tests focus on table structure, state management, and non-virtualization features.
 */

import type {ColumnDef} from '@tanstack/react-table'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {VirtualDataTable} from './VirtualDataTable'

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

const generateData = (count: number): TestData[] =>
	Array.from({length: count}, (_, i) => ({
		id: `${i}`,
		name: `User ${i}`,
		email: `user${i}@example.com`,
		status: i % 2 === 0 ? 'active' : 'inactive'
	}))

describe('VirtualDataTable', () => {
	describe('rendering', () => {
		it('should render column headers', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('Name')).toBeInTheDocument()
			expect(screen.getByText('Email')).toBeInTheDocument()
			expect(screen.getByText('Status')).toBeInTheDocument()
		})

		it('should show empty state when no data', () => {
			render(<VirtualDataTable data={[]} columns={testColumns} />)

			expect(screen.getByText('No data available')).toBeInTheDocument()
		})

		it('should render search input with placeholder', () => {
			render(
				<VirtualDataTable data={testData} columns={testColumns} searchPlaceholder='Find users...' />
			)

			expect(screen.getByPlaceholderText('Find users...')).toBeInTheDocument()
		})

		it('should use default search placeholder', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
		})

		it('should show total row count', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(screen.getByText('3 total rows')).toBeInTheDocument()
		})
	})

	describe('filtering', () => {
		it('should update row count after filtering', async () => {
			const user = userEvent.setup()
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const searchInput = screen.getByPlaceholderText('Search...')
			await user.type(searchInput, 'Alice')

			// Row count updates based on filtered data
			expect(screen.getByText('1 total rows')).toBeInTheDocument()
		})

		it('should reset row count when filter cleared', async () => {
			const user = userEvent.setup()
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const searchInput = screen.getByPlaceholderText('Search...')
			await user.type(searchInput, 'Alice')
			await user.clear(searchInput)

			expect(screen.getByText('3 total rows')).toBeInTheDocument()
		})

		it('should filter data correctly', async () => {
			const user = userEvent.setup()
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			// Before filter: 3 rows
			expect(screen.getByText('3 total rows')).toBeInTheDocument()

			const searchInput = screen.getByPlaceholderText('Search...')
			await user.type(searchInput, 'Bob')

			// After filter: 1 row
			expect(screen.getByText('1 total rows')).toBeInTheDocument()
		})
	})

	describe('sorting', () => {
		it('should have sortable column headers', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const nameHeader = screen.getByText('Name')
			const headerContainer = nameHeader.closest('div')
			expect(headerContainer).toHaveClass('cursor-pointer')
		})

		it('should allow clicking column headers without error', async () => {
			const user = userEvent.setup()
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const nameHeader = screen.getByText('Name')
			await user.click(nameHeader)
			await user.click(nameHeader)

			// No errors and table still renders (use regex to match with sort indicator)
			expect(screen.getByText(/^Name/)).toBeInTheDocument()
		})
	})

	describe('virtual scrolling structure', () => {
		it('should render large datasets without crashing', () => {
			const largeData = generateData(1000)
			render(<VirtualDataTable data={largeData} columns={testColumns} />)

			expect(screen.getByText('1000 total rows')).toBeInTheDocument()
		})

		it('should have scroll container with fixed height', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const container = document.querySelector('.h-\\[600px\\]')
			expect(container).toBeInTheDocument()
		})

		it('should have overflow-auto on scroll container', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const container = document.querySelector('.overflow-auto')
			expect(container).toBeInTheDocument()
		})

		it('should not have pagination controls', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(screen.queryByText('First')).not.toBeInTheDocument()
			expect(screen.queryByText('Previous')).not.toBeInTheDocument()
			expect(screen.queryByText('Next')).not.toBeInTheDocument()
			expect(screen.queryByText('Last')).not.toBeInTheDocument()
		})

		it('should have sticky header', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const thead = document.querySelector('thead')
			expect(thead).toHaveClass('sticky')
			expect(thead).toHaveClass('top-0')
		})
	})

	describe('row selection', () => {
		it('should not show selection column by default', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			const checkboxes = screen.queryAllByRole('checkbox')
			expect(checkboxes).toHaveLength(0)
		})

		it('should show header checkbox when row selection enabled', () => {
			render(
				<VirtualDataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					getRowId={row => row.id}
				/>
			)

			// At minimum, header checkbox should be present
			const checkboxes = screen.getAllByRole('checkbox')
			expect(checkboxes.length).toBeGreaterThanOrEqual(1)
		})

		it('should call onSelectionChange when header checkbox clicked', async () => {
			const user = userEvent.setup()
			const onSelectionChange = vi.fn()

			render(
				<VirtualDataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					onSelectionChange={onSelectionChange}
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			// Click header checkbox (first one)
			await user.click(checkboxes[0])

			expect(onSelectionChange).toHaveBeenCalled()
		})

		it('should show selected count when rows selected via header', async () => {
			const user = userEvent.setup()

			render(
				<VirtualDataTable
					data={testData}
					columns={testColumns}
					enableRowSelection
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			// Click header checkbox to select all
			await user.click(checkboxes[0])

			expect(screen.getByText(/\(3 selected\)/)).toBeInTheDocument()
		})
	})

	describe('column visibility', () => {
		it('should not show column visibility toggle by default', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(screen.queryByText('Columns')).not.toBeInTheDocument()
		})

		it('should show column visibility toggle when enabled', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} enableColumnVisibility />)

			// Use getByRole to avoid matching the SVG title
			expect(screen.getByRole('button', {name: /columns/i})).toBeInTheDocument()
		})

		it('should show column visibility dropdown button', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} enableColumnVisibility />)

			const columnsButton = screen.getByRole('button', {name: /columns/i})
			expect(columnsButton).toBeInTheDocument()
			expect(columnsButton).toHaveClass('btn')
		})
	})

	describe('table structure', () => {
		it('should render table element', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(document.querySelector('table')).toBeInTheDocument()
		})

		it('should render thead and tbody', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(document.querySelector('thead')).toBeInTheDocument()
			expect(document.querySelector('tbody')).toBeInTheDocument()
		})

		it('should apply zebra striping class', () => {
			render(<VirtualDataTable data={testData} columns={testColumns} />)

			expect(document.querySelector('.table-zebra')).toBeInTheDocument()
		})
	})
})
