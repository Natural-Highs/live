import type * as React from 'react'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode
	showDivider?: boolean
}

const GreenCard = ({
	className,
	children,
	showDivider = true,
	ref,
	...props
}: Props & {ref?: React.RefObject<HTMLDivElement | null>}) => {
	const baseClasses =
		'card bg-midGreen flex flex-col w-[25rem] shadow-xl p-1 rounded-xl mb-[0.75rem]'
	const baseClassesInner =
		'bg-midGreen w-full flex flex-col p-4 shadow-none rounded-lg'

	return (
		<div className={baseClasses} ref={ref}>
			{showDivider && (
				<hr className='mx-auto mt-[-0.15rem] h-[2px] w-[42%] bg-black' />
			)}
			<div className={`${baseClassesInner} ${className ?? ''}`} {...props}>
				{children}
			</div>
		</div>
	)
}

GreenCard.displayName = 'GreenCard'

export default GreenCard
