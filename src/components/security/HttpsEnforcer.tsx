import React, { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export const HttpsEnforcer: React.FC = () => {
	useEffect(() => {
		// Only enforce in production
		if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
			// Show warning
			console.warn('This application should be accessed over HTTPS for security.')
		}
	}, [])

	// Show warning banner if not HTTPS in production
	if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
		return (
			<div className="fixed top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-3 z-[9999]">
				<div className="max-w-7xl mx-auto flex items-center gap-3">
					<AlertTriangle className="text-yellow-600" size={20} />
					<p className="text-sm text-yellow-800">
						<strong>Security Warning:</strong> This page is not secure. 
						For your protection, please access this site using HTTPS.
					</p>
				</div>
			</div>
		)
	}

	return null
}