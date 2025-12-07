import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	plugins: [daisyui],
	daisyui: {
		themes: [
			{
				naturalhighs: {
					primary: '#347937',
					'primary-content': '#ffffff',
					secondary: '#637b7c',
					'secondary-content': '#ffffff',
					accent: '#98da87',
					'accent-content': '#1e1e1e',
					neutral: '#1e1e1e',
					'neutral-content': '#ffffff',
					'base-100': '#e2fde6',
					'base-200': '#98da87',
					'base-300': '#d4d4d4',
					'base-content': '#1e1e1e',
					info: '#3b82f6',
					'info-content': '#ffffff',
					success: '#10b981',
					'success-content': '#ffffff',
					warning: '#f59e0b',
					'warning-content': '#ffffff',
					error: '#ef4444',
					'error-content': '#ffffff'
				}
			}
		],
		darkMode: false,
		logs: false
	}
}
