import {createFileRoute, Link} from '@tanstack/react-router'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
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

				<h1 className='mb-4 font-bold text-5xl text-foreground'>Natural Highs</h1>
				<p className='mb-8 text-foreground text-lg opacity-80'>
					TODO: Add app description and welcome message
				</p>

				{user && (
					<div className='space-y-4'>
						{consentForm ? (
							<Card className='shadow-xl'>
								<CardContent className='pt-6'>
									<h2 className='card-title text-foreground'>Welcome Back</h2>
									<p className='text-foreground opacity-70'>
										Access your dashboard to join events and complete surveys
									</p>
									<div className='card-actions mt-4 justify-center'>
										<Link to='/dashboard'>
											<Button variant='default'>Go to Dashboard</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						) : (
							<Card className='shadow-xl'>
								<CardContent className='pt-6'>
									<h2 className='card-title text-foreground'>Consent Required</h2>
									<p className='text-foreground opacity-70'>
										Please complete the consent form to continue
									</p>
									<div className='card-actions mt-4 justify-center'>
										<Link to='/consent'>
											<Button variant='default'>Go to Consent Form</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				)}

				{!user && (
					<div className='space-y-4'>
						<Card className='shadow-xl'>
							<CardContent className='pt-6'>
								<h2 className='card-title text-foreground'>TODO: Add home page title</h2>
								<p className='text-foreground opacity-70'>TODO: Add home page text</p>
								<div className='card-actions mt-4 justify-center gap-4'>
									<Link to='/signup'>
										<Button variant='default'>Sign Up</Button>
									</Link>
									<Link to='/authentication'>
										<Button variant='secondary'>Log In</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</PageContainer>
	)
}
