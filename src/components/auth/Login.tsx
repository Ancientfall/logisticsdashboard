import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Checkbox } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import { handleAPIError } from '../../services/api'
import { useNotifications } from '../../context/NotificationContext'
import { useAuth } from '../../context/AuthContext'

interface LoginCredentials {
	email: string
	password: string
}

export default function Login() {
	const navigate = useNavigate()
	const { login } = useAuth()
	const { addNotification } = useNotifications()
	const [isLoading, setIsLoading] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [rememberMe, setRememberMe] = useState(false)
	
	const [credentials, setCredentials] = useState<LoginCredentials>({
		email: '',
		password: ''
	})

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {}
		
		if (!credentials.email) {
			newErrors.email = 'Email is required'
		} else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
			newErrors.email = 'Email is invalid'
		}
		
		if (!credentials.password) {
			newErrors.password = 'Password is required'
		}
		
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!validateForm()) return
		
		setIsLoading(true)
		setErrors({})
		
		try {
			await login(credentials.email, credentials.password)
			
			addNotification('system-update', {
				title: 'Welcome Back!',
				message: 'You have successfully logged in.'
			})
			
			// Redirect to dashboard
			navigate('/dashboard')
		} catch (error) {
			const errorMessage = handleAPIError(error)
			setErrors({ general: errorMessage })
			
			addNotification('system-update', {
				title: 'Login Failed',
				message: errorMessage
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="w-full max-w-md"
			>
				<Card className="shadow-2xl">
					<CardHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
						<div className="flex items-center gap-2 mb-4">
							<div className="w-10 h-10 bg-bp-green rounded-lg flex items-center justify-center">
								<LogIn className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold">Welcome Back</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Sign in to your BP Logistics account
						</p>
					</CardHeader>
					
					<CardBody className="px-6 py-6">
						<form onSubmit={handleSubmit} className="space-y-5">
							{errors.general && (
								<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
									<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
									<span className="text-sm text-red-700 dark:text-red-300">{errors.general}</span>
								</div>
							)}
							
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Email <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Mail className="w-4 h-4 text-gray-400" />
									</div>
									<input
										type="email"
										value={credentials.email}
										onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
										className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="john.doe@example.com"
										autoComplete="email"
									/>
								</div>
								{errors.email && (
									<p className="text-xs text-red-500 mt-1">{errors.email}</p>
								)}
							</div>
							
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Password <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Lock className="w-4 h-4 text-gray-400" />
									</div>
									<input
										type="password"
										value={credentials.password}
										onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
										className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="••••••••"
										autoComplete="current-password"
									/>
								</div>
								{errors.password && (
									<p className="text-xs text-red-500 mt-1">{errors.password}</p>
								)}
							</div>
							
							<div className="flex items-center justify-between">
								<Checkbox
									isSelected={rememberMe}
									onValueChange={setRememberMe}
									classNames={{
										label: "text-sm text-gray-600 dark:text-gray-400"
									}}
								>
									Remember me
								</Checkbox>
								<Link 
									to="/forgot-password" 
									className="text-sm text-bp-green hover:text-bp-green/80 font-medium transition-colors"
								>
									Forgot password?
								</Link>
							</div>
							
							<Button
								type="submit"
								className="w-full bg-bp-green text-white font-semibold"
								size="lg"
								isLoading={isLoading}
								startContent={!isLoading && <LogIn className="w-5 h-5" />}
							>
								{isLoading ? 'Signing in...' : 'Sign In'}
							</Button>
						</form>
						
						<div className="mt-6 text-center">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								Don't have an account?{' '}
								<Link 
									to="/register" 
									className="text-bp-green hover:text-bp-green/80 font-medium transition-colors"
								>
									Sign up
								</Link>
							</span>
						</div>
					</CardBody>
				</Card>
			</motion.div>
		</div>
	)
}