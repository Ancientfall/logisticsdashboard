import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import bcrypt from 'bcryptjs'

interface AuthContextType {
	isAdmin: boolean
	login: (password: string) => boolean
	logout: () => void
	loginAttempts: number
	isLocked: boolean
	lockoutTime: number | null
}

const AuthContext = createContext<AuthContextType>({
	isAdmin: false,
	login: () => false,
	logout: () => {},
	loginAttempts: 0,
	isLocked: false,
	lockoutTime: null
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
	children: ReactNode
}

// Security configuration
const PASSWORD_HASH = process.env.REACT_APP_ADMIN_PASSWORD_HASH || '$2a$10$xK1.QdQ6REjhZa.7ZBxKpeFqVV8HhC8UZdBMJZXvcL9MmV9.Gp.pS'
const SESSION_TIMEOUT = parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '3600000') // 1 hour default
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5')
const LOCKOUT_TIME = parseInt(process.env.REACT_APP_LOGIN_LOCKOUT_TIME || '900000') // 15 minutes default

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [isAdmin, setIsAdmin] = useState(false)
	const [loginAttempts, setLoginAttempts] = useState(0)
	const [isLocked, setIsLocked] = useState(false)
	const [lockoutTime, setLockoutTime] = useState<number | null>(null)
	const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)

	// Check if admin session exists and is valid on mount
	useEffect(() => {
		const checkSession = () => {
			const adminSession = localStorage.getItem('bp_admin_session')
			const expiry = localStorage.getItem('bp_session_expiry')
			
			if (adminSession === 'true' && expiry) {
				const expiryTime = parseInt(expiry)
				if (Date.now() < expiryTime) {
					setIsAdmin(true)
					setSessionExpiry(expiryTime)
				} else {
					// Session expired
					logout()
				}
			}
			
			// Check lockout status
			const lockoutEnd = localStorage.getItem('bp_lockout_end')
			const attempts = localStorage.getItem('bp_login_attempts')
			
			if (lockoutEnd) {
				const lockoutEndTime = parseInt(lockoutEnd)
				if (Date.now() < lockoutEndTime) {
					setIsLocked(true)
					setLockoutTime(lockoutEndTime)
				} else {
					// Lockout expired
					localStorage.removeItem('bp_lockout_end')
					localStorage.removeItem('bp_login_attempts')
				}
			}
			
			if (attempts) {
				setLoginAttempts(parseInt(attempts))
			}
		}
		
		checkSession()
		
		// Check session expiry every minute
		const interval = setInterval(checkSession, 60000)
		return () => clearInterval(interval)
	}, [])

	// Handle lockout timer
	useEffect(() => {
		if (isLocked && lockoutTime) {
			const timer = setTimeout(() => {
				setIsLocked(false)
				setLockoutTime(null)
				setLoginAttempts(0)
				localStorage.removeItem('bp_lockout_end')
				localStorage.removeItem('bp_login_attempts')
			}, lockoutTime - Date.now())
			
			return () => clearTimeout(timer)
		}
	}, [isLocked, lockoutTime])

	const login = (password: string): boolean => {
		// Check if account is locked
		if (isLocked) {
			return false
		}
		
		try {
			// Compare password with hash
			const isValid = bcrypt.compareSync(password, PASSWORD_HASH)
			
			if (isValid) {
				// Successful login
				const expiry = Date.now() + SESSION_TIMEOUT
				setIsAdmin(true)
				setSessionExpiry(expiry)
				setLoginAttempts(0)
				
				localStorage.setItem('bp_admin_session', 'true')
				localStorage.setItem('bp_session_expiry', expiry.toString())
				localStorage.removeItem('bp_login_attempts')
				
				return true
			} else {
				// Failed login
				const newAttempts = loginAttempts + 1
				setLoginAttempts(newAttempts)
				localStorage.setItem('bp_login_attempts', newAttempts.toString())
				
				// Check if should lock account
				if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
					const lockoutEnd = Date.now() + LOCKOUT_TIME
					setIsLocked(true)
					setLockoutTime(lockoutEnd)
					localStorage.setItem('bp_lockout_end', lockoutEnd.toString())
				}
				
				return false
			}
		} catch (error) {
			console.error('Login error:', error)
			return false
		}
	}

	const logout = () => {
		setIsAdmin(false)
		setSessionExpiry(null)
		localStorage.removeItem('bp_admin_session')
		localStorage.removeItem('bp_session_expiry')
	}

	return (
		<AuthContext.Provider value={{ 
			isAdmin, 
			login, 
			logout, 
			loginAttempts, 
			isLocked, 
			lockoutTime 
		}}>
			{children}
		</AuthContext.Provider>
	)
}

export default AuthContext