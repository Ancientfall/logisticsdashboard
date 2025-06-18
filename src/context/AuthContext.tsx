import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'

interface AuthContextType {
	user: User | null
	isAuthenticated: boolean
	isLoading: boolean
	login: (email: string, password: string) => Promise<void>
	logout: () => void
	register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	isAuthenticated: false,
	isLoading: false,
	login: async () => {},
	logout: () => {},
	register: async () => {}
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
	children: ReactNode
}

// Mock users for development/demo purposes
const MOCK_USERS: User[] = [
	{
		id: '1',
		email: 'admin@bp.com',
		firstName: 'Admin',
		lastName: 'User',
		role: 'admin',
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '2',
		email: 'manager@bp.com',
		firstName: 'Manager',
		lastName: 'User',
		role: 'manager',
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '3',
		email: 'viewer@bp.com',
		firstName: 'Viewer',
		lastName: 'User',
		role: 'viewer',
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	}
]

// Default password for all mock users (in production, this would be properly hashed)
const DEFAULT_PASSWORD = 'bp123'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	// Check for existing session on mount
	useEffect(() => {
		const checkSession = async () => {
			try {
				// Add delay to stabilize loading state
				await new Promise(resolve => setTimeout(resolve, 300))
				
				const userData = localStorage.getItem('bp_user_session')
				
				if (userData) {
					const parsedUser = JSON.parse(userData)
					// Validate that user data is still valid
					const foundUser = MOCK_USERS.find(u => u.id === parsedUser.id && u.isActive)
					if (foundUser) {
						setUser(foundUser)
					} else {
						// User data is invalid, clear session
						localStorage.removeItem('bp_user_session')
					}
				}
			} catch (error) {
				console.error('Session check error:', error)
				localStorage.removeItem('bp_user_session')
			} finally {
				setIsLoading(false)
			}
		}
		
		checkSession()
	}, [])

	const login = async (email: string, password: string): Promise<void> => {
		setIsLoading(true)
		
		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 1000))
			
			// Find user by email
			const foundUser = MOCK_USERS.find(u => u.email === email && u.isActive)
			
			if (!foundUser) {
				throw new Error('Invalid email or password')
			}
			
			// Check password (in production, this would be properly hashed comparison)
			if (password !== DEFAULT_PASSWORD) {
				throw new Error('Invalid email or password')
			}
			
			// Update last login
			const userWithLastLogin = {
				...foundUser,
				lastLogin: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}
			
			setUser(userWithLastLogin)
			localStorage.setItem('bp_user_session', JSON.stringify(userWithLastLogin))
		} catch (error) {
			console.error('Login error:', error)
			throw error
		} finally {
			setIsLoading(false)
		}
	}

	const register = async (data: { email: string; password: string; firstName: string; lastName: string }): Promise<void> => {
		setIsLoading(true)
		
		try {
			// Simulate API delay
			await new Promise(resolve => setTimeout(resolve, 1000))
			
			// Check if user already exists
			const existingUser = MOCK_USERS.find(u => u.email === data.email)
			if (existingUser) {
				throw new Error('User with this email already exists')
			}
			
			// In a real application, this would make an API call to register the user
			throw new Error('Registration is currently disabled in demo mode')
		} catch (error) {
			console.error('Registration error:', error)
			throw error
		} finally {
			setIsLoading(false)
		}
	}

	const logout = () => {
		setUser(null)
		localStorage.removeItem('bp_user_session')
	}

	const isAuthenticated = !!user

	return (
		<AuthContext.Provider value={{ 
			user,
			isAuthenticated,
			isLoading,
			login, 
			logout,
			register
		}}>
			{children}
		</AuthContext.Provider>
	)
}

export default AuthContext