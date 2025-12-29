import type React from 'react'
import type {ReactNode} from 'react'
import Navbar from './Navbar'
import {GracePeriodBanner} from './session/GracePeriodBanner'

interface LayoutProps {
	children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({children}) => (
	<div className='min-h-screen'>
		<Navbar />
		<GracePeriodBanner className='mx-4 mt-4' />
		<main>{children}</main>
	</div>
)

export default Layout
