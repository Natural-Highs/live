import {Suspense} from 'react'
import {ErrorBoundary, type FallbackProps} from 'react-error-boundary'
import {Route, Routes} from 'react-router'
import {LoadingOrError} from '@/components/LoadingOrError'
import {Head} from '@/components/Head'

function renderError({error}: FallbackProps) {
	return <LoadingOrError error={error} />
}

function Home() {
	return (
		<>
			<Head title='Natural Highs' />
			<div className='grid min-h-screen place-content-center'>
				<h1 className='text-4xl font-bold'>Natural Highs</h1>
			</div>
		</>
	)
}

export function App() {
	return (
		<ErrorBoundary fallbackRender={renderError}>
			<Suspense fallback={<LoadingOrError />}>
				<Routes>
					<Route element={<Home />} index={true} />
				</Routes>
			</Suspense>
		</ErrorBoundary>
	)
}
