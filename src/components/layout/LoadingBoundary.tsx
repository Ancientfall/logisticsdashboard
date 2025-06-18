import React, { useState, useEffect } from 'react'
import { Spinner } from '@nextui-org/react'

interface LoadingBoundaryProps {
	children: React.ReactNode
	delay?: number
}

export default function LoadingBoundary({ children, delay = 500 }: LoadingBoundaryProps) {
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsReady(true)
		}, delay)

		return () => clearTimeout(timer)
	}, [delay])

	if (!isReady) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<Spinner size="lg" color="primary" />
					<p className="mt-4 text-gray-600">Initializing BP Logistics Dashboard...</p>
				</div>
			</div>
		)
	}

	return <>{children}</>
}