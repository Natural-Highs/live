import {createFileRoute, Link} from '@tanstack/react-router'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {useAuth} from '../context/AuthContext'

export const Route = createFileRoute('/')({
	component: HomeComponent
})

function HomeComponent() {
	const {user, consentForm} = useAuth()

	return (
		<PageContainer>
			<div className='w-full max-w-2xl text-center'>
				<div className='mb-8'>
					<Logo size='lg' />
				</div>

				<h1 className='mb-4 font-bold text-5xl text-base-content'>
					Natural Highs
				</h1>
				<p className='mb-8 text-base-content text-lg opacity-80'>
					TODO: Add app description and welcome message
				</p>

				{user && (
					<div className='space-y-4'>
						{consentForm ? (
							<div className='card bg-base-200 shadow-xl'>
								<div className='card-body'>
									<h2 className='card-title text-base-content'>Welcome Back</h2>
									<p className='text-base-content opacity-70'>
										Access your dashboard to join events and complete surveys
									</p>
									<div className='card-actions mt-4 justify-center'>
										<Link className='btn btn-primary' to='/dashboard'>
											Go to Dashboard
										</Link>
									</div>
								</div>
							</div>
						) : (
							<div className='card bg-base-200 shadow-xl'>
								<div className='card-body'>
									<h2 className='card-title text-base-content'>
										Consent Required
									</h2>
									<p className='text-base-content opacity-70'>
										Please complete the consent form to continue
									</p>
									<div className='card-actions mt-4 justify-center'>
										<Link className='btn btn-primary' to='/consent'>
											Go to Consent Form
										</Link>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{!user && (
					<div className='space-y-4'>
						<div className='card bg-base-200 shadow-xl'>
							<div className='card-body'>
								<h2 className='card-title text-base-content'>
									TODO: Add home page title
								</h2>
								<p className='text-base-content opacity-70'>
									TODO: Add home page text
								</p>
								<div className='card-actions mt-4 justify-center gap-4'>
									<Link className='btn btn-primary' to='/signup'>
										Sign Up
									</Link>
									<Link className='btn btn-secondary' to='/authentication'>
										Log In
									</Link>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</PageContainer>
	)
}
