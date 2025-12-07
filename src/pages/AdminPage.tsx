import type React from 'react'
import {Route, Routes} from 'react-router-dom'
import Chart from '@/components/ui/chart'
import {PageContainer} from '@/components/ui/page-container'

const AdminHome: React.FC = () => {
	return (
		<PageContainer>
			<h1 className='mb-4 font-bold text-2xl'>Admin Dashboard</h1>
			<div className='alert alert-info mb-4'>
				<span>Charts framework - TODO: Implement data visualization</span>
			</div>
			{/* TODO: Add charts with real data */}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<div className='card bg-base-200 shadow-xl'>
					<div className='card-body'>
						<h2 className='card-title'>Sample Chart</h2>
						<p className='text-sm opacity-70'>
							Chart component TODO: Implement data visualization
						</p>
						{/* Example chart - replace with real data */}
						<Chart
							data={{
								labels: ['Placeholder'],
								datasets: [
									{
										label: 'Sample',
										data: [0],
										backgroundColor: 'rgba(52, 121, 55, 0.5)'
									}
								]
							}}
							options={{
								plugins: {
									title: {
										display: true,
										text: 'TODO: Add real data'
									}
								}
							}}
							type='bar'
						/>
					</div>
				</div>
			</div>
		</PageContainer>
	)
}

const AdminPage: React.FC = () => (
	<div className='container mx-auto p-4'>
		<h1 className='font-bold text-2xl'>Admin</h1>
		<Routes>
			<Route element={<AdminHome />} path='/' />
		</Routes>
	</div>
)

export default AdminPage
