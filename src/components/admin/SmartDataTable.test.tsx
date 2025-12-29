/**
 * Unit tests for SmartDataTable component
 * Tests virtualization threshold switching between DataTable and VirtualDataTable
 */

import type {ColumnDef} from '@tanstack/react-table'
import {render, screen} from '@testing-library/react'
import {SmartDataTable} from './SmartDataTable'

interface TestData {
	id: string
	name: string
}

const testColumns: ColumnDef<TestData, unknown>[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	}
]

const generateData = (count: number): TestData[] =>
	Array.from({length: count}, (_, i) => ({
		id: `${i}`,
		name: `User ${i}`
	}))

describe('SmartDataTable', () => {
	describe('virtualization threshold', () => {
		it('should render DataTable for small datasets', () => {
			const smallData = generateData(100)
			render(<SmartDataTable data={smallData} columns={testColumns} />)

			// DataTable has pagination controls
			expect(screen.getByText('First')).toBeInTheDocument()
			expect(screen.getByText('Previous')).toBeInTheDocument()
			expect(screen.getByText('Next')).toBeInTheDocument()
			expect(screen.getByText('Last')).toBeInTheDocument()
		})

		it('should render DataTable for datasets under 500 rows', () => {
			const data = generateData(499)
			render(<SmartDataTable data={data} columns={testColumns} />)

			// DataTable shows "Showing X to Y of Z entries"
			expect(screen.getByText(/Showing \d+ to \d+ of 499 entries/)).toBeInTheDocument()
		})

		it('should render VirtualDataTable for datasets at threshold', () => {
			const data = generateData(500)
			render(<SmartDataTable data={data} columns={testColumns} />)

			// VirtualDataTable shows "X total rows" instead of pagination
			expect(screen.getByText('500 total rows')).toBeInTheDocument()
		})

		it('should render VirtualDataTable for large datasets', () => {
			const largeData = generateData(1000)
			render(<SmartDataTable data={largeData} columns={testColumns} />)

			// VirtualDataTable shows "X total rows" instead of pagination
			expect(screen.getByText('1000 total rows')).toBeInTheDocument()
		})

		it('should use VIRTUALIZATION_THRESHOLD of 500', () => {
			// Verify exact threshold behavior
			const underThreshold = generateData(499)
			const atThreshold = generateData(500)

			const {unmount} = render(<SmartDataTable data={underThreshold} columns={testColumns} />)
			expect(screen.queryByText('499 total rows')).not.toBeInTheDocument()
			expect(screen.getByText(/of 499 entries/)).toBeInTheDocument()
			unmount()

			render(<SmartDataTable data={atThreshold} columns={testColumns} />)
			expect(screen.getByText('500 total rows')).toBeInTheDocument()
		})
	})

	describe('prop forwarding', () => {
		it('should forward searchPlaceholder to DataTable', () => {
			const data = generateData(10)
			render(<SmartDataTable data={data} columns={testColumns} searchPlaceholder='Find users...' />)

			expect(screen.getByPlaceholderText('Find users...')).toBeInTheDocument()
		})

		it('should forward searchPlaceholder to VirtualDataTable', () => {
			const data = generateData(600)
			render(<SmartDataTable data={data} columns={testColumns} searchPlaceholder='Search all...' />)

			expect(screen.getByPlaceholderText('Search all...')).toBeInTheDocument()
		})

		it('should forward enableRowSelection to DataTable', () => {
			const data = generateData(10)
			render(
				<SmartDataTable
					data={data}
					columns={testColumns}
					enableRowSelection
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			expect(checkboxes.length).toBeGreaterThan(0)
		})

		it('should forward enableRowSelection to VirtualDataTable', () => {
			const data = generateData(600)
			render(
				<SmartDataTable
					data={data}
					columns={testColumns}
					enableRowSelection
					getRowId={row => row.id}
				/>
			)

			const checkboxes = screen.getAllByRole('checkbox')
			expect(checkboxes.length).toBeGreaterThan(0)
		})

		it('should forward enableColumnVisibility', () => {
			const data = generateData(10)
			render(<SmartDataTable data={data} columns={testColumns} enableColumnVisibility />)

			// Use getByRole to avoid matching the SVG title
			expect(screen.getByRole('button', {name: /columns/i})).toBeInTheDocument()
		})
	})

	describe('empty data', () => {
		it('should render DataTable for empty array', () => {
			render(<SmartDataTable data={[]} columns={testColumns} />)

			// DataTable shows "No data available"
			expect(screen.getByText('No data available')).toBeInTheDocument()
		})
	})
})
