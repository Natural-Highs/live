import type * as React from 'react'

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: 'sm' | 'md' | 'lg'
	showEmoji?: boolean
}

const Logo = ({
	className,
	size = 'md',
	showEmoji = true,
	ref,
	...props
}: LogoProps & {ref?: React.RefObject<HTMLDivElement | null>}) => {
	const sizeClasses = {
		sm: 'w-16 h-16 text-2xl',
		md: 'w-28 h-28 text-4xl',
		lg: 'w-36 h-36 text-5xl'
	}

	return (
		<div
			className={`flex items-center justify-center rounded-lg bg-muted ${
				sizeClasses[size]
			} ${className || ''}`}
			ref={ref}
			{...props}
		>
			{showEmoji && <span>🌿</span>}
		</div>
	)
}
Logo.displayName = 'Logo'

export {Logo}
