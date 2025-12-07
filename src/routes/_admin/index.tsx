import {createFileRoute} from '@tanstack/react-router'
import {useEffect, useState} from 'react'
import {Line} from 'react-chartjs-2'
import {
	CategoryScale,
	Chart as ChartJS,
	type ChartOptions,
	Legend,
	LineElement,
	LinearScale,
	PointElement,
	Title,
	Tooltip
} from 'chart.js'

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend
)

export const Route = createFileRoute('/_admin/')({
	component: AdminDashboard
})

interface StatsData {
	totalUsers: number
	totalEvents: number
	totalResponses: number
	activeEvents: number
}

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function AdminDashboard() {
	const [stats, setStats] = useState<StatsData>({
		totalUsers: 0,
		totalEvents: 0,
		totalResponses: 0,
		activeEvents: 0
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		const fetchStats = async () => {
			setLoading(true)
			setError('')
			try {
				const response = await fetch('/api/admin/stats')
				const data = (await response.json()) as {
					success: boolean
					stats?: StatsData
					error?: string
				}

				if (response.ok && data.success && data.stats) {
					setStats(data.stats)
				} else {
					setError(data.error || 'Failed to load statistics')
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load statistics')
			} finally {
				setLoading(false)
			}
		}

		fetchStats()
	}, [])

	const chartData = {
		labels: ['Users', 'Events', 'Responses', 'Active Events'],
		datasets: [
			{
				label: 'System Statistics',
				data: [
					stats.totalUsers,
					stats.totalEvents,
					stats.totalResponses,
					stats.activeEvents
				],
				borderColor: 'rgb(75, 192, 192)',
				backgroundColor: 'rgba(75, 192, 192, 0.2)',
				tension: 0.1
			}
		]
	}

	const chartOptions: ChartOptions<'line'> = {
		responsive: true,
		plugins: {
			legend: {
				position: 'top'
			},
			title: {
				display: true,
				text: 'Natural Highs System Overview'
			}
		}
	}

	if (loading) {
		return (
			<div className='container mx-auto p-4'>
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<h1 className='mb-4 font-bold text-2xl'>Admin Dashboard</h1>

			{error && (
				<div className='alert alert-error mb-4'>
					<span>{error}</span>
				</div>
			)}

			{/* Statistics Cards */}
			<div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<div className='card bg-base-200 shadow-xl'>
					<div className='card-body'>
						<h2 className='card-title'>Total Users</h2>
						<p className='font-bold text-3xl'>{stats.totalUsers}</p>
					</div>
				</div>
				<div className='card bg-base-200 shadow-xl'>
					<div className='card-body'>
						<h2 className='card-title'>Total Events</h2>
						<p className='font-bold text-3xl'>{stats.totalEvents}</p>
					</div>
				</div>
				<div className='card bg-base-200 shadow-xl'>
					<div className='card-body'>
						<h2 className='card-title'>Survey Responses</h2>
						<p className='font-bold text-3xl'>{stats.totalResponses}</p>
					</div>
				</div>
				<div className='card bg-base-200 shadow-xl'>
					<div className='card-body'>
						<h2 className='card-title'>Active Events</h2>
						<p className='font-bold text-3xl'>{stats.activeEvents}</p>
					</div>
				</div>
			</div>

			{/* Chart */}
			<div className='card bg-base-200 shadow-xl'>
				<div className='card-body'>
					<Line data={chartData} options={chartOptions} />
				</div>
			</div>

			{/* Quick Links */}
			<div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
				<a className='btn btn-primary' href='/admin/events'>
					Manage Events
				</a>
				<a className='btn btn-primary' href='/admin/surveys'>
					View Survey Responses
				</a>
				<a className='btn btn-primary' href='/admin/users'>
					Manage Users
				</a>
			</div>
		</div>
	)
}
