import type * as React from 'react'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
}

const TitleCard = ({
	className,
	children,
	ref,
	...props
}: Props & {ref?: React.RefObject<HTMLDivElement | null>}) => {
	const baseClasses =
		'card bg-midGreen shadow-xl pb-1 px-[2rem] rounded-lg mb-[-0.75rem] h-auto'
	//flex justify-center

	return (
		<div className={`${baseClasses} ${className ?? ''}`} ref={ref} {...props}>
			{children}
		</div>
	)
}

TitleCard.displayName = 'TitleCard'

export default TitleCard
