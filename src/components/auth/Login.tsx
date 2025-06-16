import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Input, Checkbox } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react'
import { authAPI, handleAPIError } from '../../services/api'
import { LoginCredentials } from '../../types'
import { useNotification } from '../../contexts/NotificationContext'

export default function Login() {
	const navigate = useNavigate()
	const { showNotification } = useNotification()
	const [isLoading, setIsLoading] = useState(false)
	const [rememberMe, setRememberMe] = useState(false)
	const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
	
	const [credentials, setCredentials] = useState<LoginCredentials>({
		email: '',
		password: ''
	})

	const validateForm = (): boolean => {
		const newErrors: typeof errors = {}
		
		if (!credentials.email) {
			newErrors.email = 'Email is required'
		} else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
			newErrors.email = 'Email is invalid'
		}
		
		if (!credentials.password) {
			newErrors.password = 'Password is required'
		} else if (credentials.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters'
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
			await authAPI.login(credentials)
			
			showNotification({
				title: 'Welcome back!',
				message: 'You have successfully logged in.',
				type: 'success'
			})
			
			// Redirect to dashboard
			navigate('/')
		} catch (error) {
			const errorMessage = handleAPIError(error)
			setErrors({ general: errorMessage })
			
			showNotification({
				title: 'Login Failed',
				message: errorMessage,
				type: 'error'
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
							<h1 className="text-2xl font-bold">BP Logistics Dashboard</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Sign in to access your dashboard
						</p>
					</CardHeader>
					
					<CardBody className="px-6 py-6">
						<form onSubmit={handleSubmit} className="space-y-4">
							{errors.general && (
								<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
									<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
									<span className="text-sm text-red-700 dark:text-red-300">{errors.general}</span>
								</div>
							)}
							
							<Input
								label="Email"
								placeholder="Enter your email"
								type="email"
								value={credentials.email}
								onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
								startContent={<Mail className="w-4 h-4 text-gray-400" />}
								isInvalid={!!errors.email}
								errorMessage={errors.email}
								isRequired
								autoComplete="email"
							/>
							
							<Input
								label="Password"
								placeholder="Enter your password"
								type="password"
								value={credentials.password}
								onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
								startContent={<Lock className="w-4 h-4 text-gray-400" />}
								isInvalid={!!errors.password}
								errorMessage={errors.password}
								isRequired
								autoComplete="current-password"
							/>
							
							<div className="flex items-center justify-between">
								<Checkbox
									isSelected={rememberMe}
									onValueChange={setRememberMe}
									size="sm"
								>
									Remember me
								</Checkbox>
								
								<Link 
									to="/forgot-password" 
									className="text-sm text-bp-green hover:text-bp-green/80 transition-colors"
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
				
				<p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
					© 2024 BP p.l.c. All rights reserved.
				</p>
			</motion.div>
		</div>
	)
}