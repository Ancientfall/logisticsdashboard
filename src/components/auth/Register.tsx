import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, UserPlus, AlertCircle, Shield } from 'lucide-react'
import { authAPI, handleAPIError } from '../../services/api'
import { RegisterData } from '../../types'
import { useNotifications } from '../../context/NotificationContext'
import PasswordStrengthIndicator from './PasswordStrengthIndicator'

export default function Register() {
	const navigate = useNavigate()
	const { addNotification } = useNotifications()
	const [isLoading, setIsLoading] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	
	const [formData, setFormData] = useState<RegisterData>({
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		role: 'viewer'
	})

	const [confirmPassword, setConfirmPassword] = useState('')

	const roles = [
		{ value: 'viewer', label: 'Viewer', description: 'Can view data and reports' },
		{ value: 'manager', label: 'Manager', description: 'Can view and upload data' },
		{ value: 'admin', label: 'Admin', description: 'Full access to all features' }
	]

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {}
		
		if (!formData.firstName.trim()) {
			newErrors.firstName = 'First name is required'
		}
		
		if (!formData.lastName.trim()) {
			newErrors.lastName = 'Last name is required'
		}
		
		if (!formData.email) {
			newErrors.email = 'Email is required'
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = 'Email is invalid'
		}
		
		if (!formData.password) {
			newErrors.password = 'Password is required'
		} else if (formData.password.length < 8) {
			newErrors.password = 'Password must be at least 8 characters'
		} else if (!/[A-Z]/.test(formData.password)) {
			newErrors.password = 'Password must contain at least one uppercase letter'
		} else if (!/[a-z]/.test(formData.password)) {
			newErrors.password = 'Password must contain at least one lowercase letter'
		} else if (!/[0-9]/.test(formData.password)) {
			newErrors.password = 'Password must contain at least one number'
		} else if (!/[!@#$%^&*]/.test(formData.password)) {
			newErrors.password = 'Password must contain at least one special character (!@#$%^&*)'
		}
		
		if (formData.password !== confirmPassword) {
			newErrors.confirmPassword = 'Passwords do not match'
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
			await authAPI.register(formData)
			
			addNotification('system-update', {
				title: 'Account Created!',
				message: 'Your account has been successfully created.'
			})
			
			// Redirect to dashboard
			navigate('/dashboard')
		} catch (error) {
			const errorMessage = handleAPIError(error)
			setErrors({ general: errorMessage })
			
			addNotification('system-update', {
				title: 'Registration Failed',
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
								<UserPlus className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold">Create Account</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Sign up for BP Logistics Dashboard
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
							
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
										First Name <span className="text-red-500">*</span>
									</label>
									<div className="relative">
										<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
											<User className="w-4 h-4 text-gray-400" />
										</div>
										<input
											type="text"
											value={formData.firstName}
											onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
											className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
												errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
											}`}
											placeholder="John"
										/>
									</div>
									{errors.firstName && (
										<p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
									)}
								</div>
								
								<div className="space-y-2">
									<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
										Last Name <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={formData.lastName}
										onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
										className={`w-full px-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="Doe"
									/>
									{errors.lastName && (
										<p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
									)}
								</div>
							</div>
							
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
										value={formData.email}
										onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
									Role <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Shield className="w-4 h-4 text-gray-400" />
									</div>
									<select
										value={formData.role}
										onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
										className="w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] hover:border-gray-400 dark:hover:border-gray-600 appearance-none cursor-pointer"
									>
										{roles.map((role) => (
											<option key={role.value} value={role.value}>
												{role.label} - {role.description}
											</option>
										))}
									</select>
								</div>
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
										value={formData.password}
										onChange={(e) => setFormData({ ...formData, password: e.target.value })}
										className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="••••••••"
										autoComplete="new-password"
									/>
								</div>
								{errors.password && (
									<p className="text-xs text-red-500 mt-1">{errors.password}</p>
								)}
								<PasswordStrengthIndicator password={formData.password} />
							</div>
							
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Confirm Password <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Lock className="w-4 h-4 text-gray-400" />
									</div>
									<input
										type="password"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="••••••••"
										autoComplete="new-password"
									/>
								</div>
								{errors.confirmPassword && (
									<p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
								)}
							</div>
							
							<Button
								type="submit"
								className="w-full bg-bp-green text-white font-semibold"
								size="lg"
								isLoading={isLoading}
								startContent={!isLoading && <UserPlus className="w-5 h-5" />}
							>
								{isLoading ? 'Creating Account...' : 'Create Account'}
							</Button>
						</form>
						
						<div className="mt-6 text-center">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								Already have an account?{' '}
								<Link 
									to="/login" 
									className="text-bp-green hover:text-bp-green/80 font-medium transition-colors"
								>
									Sign in
								</Link>
							</span>
						</div>
					</CardBody>
				</Card>
				
				<p className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
					By creating an account, you agree to BP's Terms of Service and Privacy Policy
				</p>
			</motion.div>
		</div>
	)
}