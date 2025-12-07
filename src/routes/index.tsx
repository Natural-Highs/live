import {createFileRoute} from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: HomeComponent
})

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function HomeComponent() {
	return (
		<div className='mt-4 p-4'>
			<h1 className='font-bold text-3xl'>Welcome to TanStack Start</h1>
			<p className='mt-4'>Migration from Vite + React Router successful!</p>
		</div>
	)
}
