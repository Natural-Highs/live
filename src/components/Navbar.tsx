import type React from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../context/AuthContext'

const Navbar: React.FC = () => {
	const {user, admin} = useAuth()

	return (
		<nav className='navbar bg-base-200'>
			<div className='flex-1'>
				<Link className='btn btn-ghost text-xl' to='/'>
					Natural Highs
				</Link>
			</div>
			<div className='flex-none'>
				{user ? (
					<>
						{admin && (
							<Link className='btn btn-ghost' to='/admin'>
								Admin
							</Link>
						)}
						<Link className='btn btn-ghost' to='/dashboard'>
							Dashboard
						</Link>
						<button className='btn btn-ghost' type='button'>
							Logout
						</button>
					</>
				) : (
					<Link className='btn btn-ghost' to='/authentication'>
						Login
					</Link>
				)}
			</div>
		</nav>
	)
}

export default Navbar
