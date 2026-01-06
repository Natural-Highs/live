import {createFileRoute} from '@tanstack/react-router'
import {
	CategoryScale,
	Chart as ChartJS,
	type ChartOptions,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	Title,
	Tooltip
} from 'chart.js'
import {useEffect, useState} from 'react'
import {Line} from 'react-chartjs-2'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardTitle} from '@/components/ui/card'
import {Spinner} from '@/components/ui/spinner'
import {getAdminStats} from '@/server/functions/admin'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export const Route = createFileRoute('/_authed/_admin/admin-dashboard')({
	component: AdminDashboard
})

interface StatsData {
	totalUsers: number
	totalEvents: number
	totalResponses: number
	activeEvents: number
}

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
				const data = await getAdminStats()
				setStats(data)
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
				data: [stats.totalUsers, stats.totalEvents, stats.totalResponses, stats.activeEvents],
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
				<Spinner size='lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<h1 className='mb-4 font-bold text-2xl'>Admin Dashboard</h1>

			{error && (
				<div className='mb-4 rounded-lg bg-destructive/15 p-4 text-destructive'>
					<span>{error}</span>
				</div>
			)}

			{/* Statistics Cards */}
			<div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
				<Card data-testid='card-container'>
					<CardContent className='pt-6'>
						<CardTitle className='text-base'>Total Users</CardTitle>
						<p className='font-bold text-3xl'>{stats.totalUsers}</p>
					</CardContent>
				</Card>
				<Card data-testid='card-container'>
					<CardContent className='pt-6'>
						<CardTitle className='text-base'>Total Events</CardTitle>
						<p className='font-bold text-3xl'>{stats.totalEvents}</p>
					</CardContent>
				</Card>
				<Card data-testid='card-container'>
					<CardContent className='pt-6'>
						<CardTitle className='text-base'>Survey Responses</CardTitle>
						<p className='font-bold text-3xl'>{stats.totalResponses}</p>
					</CardContent>
				</Card>
				<Card data-testid='card-container'>
					<CardContent className='pt-6'>
						<CardTitle className='text-base'>Active Events</CardTitle>
						<p className='font-bold text-3xl'>{stats.activeEvents}</p>
					</CardContent>
				</Card>
			</div>

			{/* Chart */}
			<Card data-testid='card-container'>
				<CardContent className='pt-6'>
					<Line data={chartData} options={chartOptions} />
				</CardContent>
			</Card>

			{/* Quick Links */}
			<div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-3'>
				<Button asChild data-testid='button-primary'>
					<a href='/admin/events'>Manage Events</a>
				</Button>
				<Button asChild data-testid='button-primary'>
					<a href='/admin/surveys'>View Survey Responses</a>
				</Button>
				<Button asChild data-testid='button-primary'>
					<a href='/admin/users'>Manage Users</a>
				</Button>
			</div>
		</div>
	)
}
