import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, UserPlus, AlertCircle, Shield } from 'lucide-react'
import { authAPI, handleAPIError } from '../../services/api'
import { RegisterData } from '../../types'
import { useNotification } from '../../contexts/NotificationContext'

export default function Register() {
	const navigate = useNavigate()
	const { showNotification } = useNotification()
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
		} else if (formData.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters'
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
			
			showNotification({
				title: 'Account Created!',
				message: 'Your account has been successfully created.',
				type: 'success'
			})
			
			// Redirect to dashboard
			navigate('/')
		} catch (error) {
			const errorMessage = handleAPIError(error)
			setErrors({ general: errorMessage })
			
			showNotification({
				title: 'Registration Failed',
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
								<UserPlus className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold">Create Account</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Sign up for BP Logistics Dashboard
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
							
							<div className="grid grid-cols-2 gap-4">
								<Input
									label="First Name"
									placeholder="John"
									value={formData.firstName}
									onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
									startContent={<User className="w-4 h-4 text-gray-400" />}
									isInvalid={!!errors.firstName}
									errorMessage={errors.firstName}
									isRequired
								/>
								
								<Input
									label="Last Name"
									placeholder="Doe"
									value={formData.lastName}
									onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
									isInvalid={!!errors.lastName}
									errorMessage={errors.lastName}
									isRequired
								/>
							</div>
							
							<Input
								label="Email"
								placeholder="john.doe@bp.com"
								type="email"
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
								startContent={<Mail className="w-4 h-4 text-gray-400" />}
								isInvalid={!!errors.email}
								errorMessage={errors.email}
								isRequired
								autoComplete="email"
							/>
							
							<Select
								label="Role"
								placeholder="Select your role"
								value={formData.role}
								onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
								startContent={<Shield className="w-4 h-4 text-gray-400" />}
								isRequired
							>
								{roles.map((role) => (
									<SelectItem key={role.value} value={role.value}>
										<div>
											<p className="font-medium">{role.label}</p>
											<p className="text-xs text-gray-500">{role.description}</p>
										</div>
									</SelectItem>
								))}
							</Select>
							
							<Input
								label="Password"
								placeholder="Create a password"
								type="password"
								value={formData.password}
								onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								startContent={<Lock className="w-4 h-4 text-gray-400" />}
								isInvalid={!!errors.password}
								errorMessage={errors.password}
								isRequired
								autoComplete="new-password"
							/>
							
							<Input
								label="Confirm Password"
								placeholder="Confirm your password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								startContent={<Lock className="w-4 h-4 text-gray-400" />}
								isInvalid={!!errors.confirmPassword}
								errorMessage={errors.confirmPassword}
								isRequired
								autoComplete="new-password"
							/>
							
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