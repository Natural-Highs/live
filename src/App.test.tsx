import {App} from './App'
import {render, screen} from './test-utils'

it('should render home page', async () => {
	render(<App />, {route: '/'})

	await expect(
		screen.findByRole('heading', {name: /Natural Highs/})
	).resolves.toBeInTheDocument()
})
