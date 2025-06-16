import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '@nextui-org/react'

interface PrivateRouteProps {
	children: React.ReactNode
	requiredRole?: 'admin' | 'manager' | 'viewer'
}

export default function PrivateRoute({ children, requiredRole }: PrivateRouteProps) {
	const { user, isAuthenticated, isLoading } = useAuth()
	const location = useLocation()

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Spinner size="lg" color="primary" />
			</div>
		)
	}

	if (!isAuthenticated) {
		// Redirect to login page but save the attempted location
		return <Navigate to="/login" state={{ from: location }} replace />
	}

	// Check role-based access
	if (requiredRole) {
		const roleHierarchy = {
			viewer: 1,
			manager: 2,
			admin: 3
		}

		const userRoleLevel = roleHierarchy[user?.role || 'viewer']
		const requiredRoleLevel = roleHierarchy[requiredRole]

		if (userRoleLevel < requiredRoleLevel) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
							Access Denied
						</h2>
						<p className="text-gray-600 dark:text-gray-400">
							You don't have permission to access this page.
						</p>
					</div>
				</div>
			)
		}
	}

	return <>{children}</>
}