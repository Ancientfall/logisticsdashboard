import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '../types'
import { authAPI, tokenManager } from '../services/api'
import { useNotification } from './NotificationContext'

interface AuthContextValue {
	user: User | null
	isAuthenticated: boolean
	isLoading: boolean
	login: (email: string, password: string) => Promise<void>
	register: (data: any) => Promise<void>
	logout: () => Promise<void>
	refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

interface AuthProviderProps {
	children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	const navigate = useNavigate()
	const { showNotification } = useNotification()
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Check for existing auth on mount
		const checkAuth = async () => {
			try {
				const token = tokenManager.getToken()
				const savedUser = tokenManager.getUser()
				
				if (token && savedUser) {
					// Validate token by fetching current user
					const currentUser = await authAPI.getCurrentUser()
					setUser(currentUser)
				}
			} catch (error) {
				// Token is invalid, clear auth
				tokenManager.clear()
				setUser(null)
			} finally {
				setIsLoading(false)
			}
		}
		
		checkAuth()
	}, [])

	const login = async (email: string, password: string) => {
		const response = await authAPI.login({ email, password })
		setUser(response.user)
	}

	const register = async (data: any) => {
		const response = await authAPI.register(data)
		setUser(response.user)
	}

	const logout = async () => {
		try {
			await authAPI.logout()
		} catch (error) {
			// Still logout even if API call fails
			console.error('Logout API call failed:', error)
		} finally {
			setUser(null)
			tokenManager.clear()
			navigate('/login')
			showNotification({
				title: 'Logged Out',
				message: 'You have been successfully logged out.',
				type: 'info'
			})
		}
	}

	const refreshAuth = async () => {
		try {
			const response = await authAPI.refreshToken()
			setUser(response.user)
		} catch (error) {
			// Token refresh failed, logout
			await logout()
			throw error
		}
	}

	const value: AuthContextValue = {
		user,
		isAuthenticated: !!user,
		isLoading,
		login,
		register,
		logout,
		refreshAuth
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}