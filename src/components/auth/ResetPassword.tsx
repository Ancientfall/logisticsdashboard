import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Lock, XCircle } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useNotifications } from '../../context/NotificationContext'

export default function ResetPassword() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { addNotification } = useNotifications()
	
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [isValidating, setIsValidating] = useState(true)
	const [isValidToken, setIsValidToken] = useState(false)
	const [tokenEmail, setTokenEmail] = useState('')
	const [errors, setErrors] = useState<Record<string, string>>({})
	
	const token = searchParams.get('token')

	const validateToken = useCallback(async () => {
		try {
			const response = await authAPI.validateResetToken(token!)
			setIsValidToken(response.valid)
			setTokenEmail(response.email || '')
		} catch (error) {
			setIsValidToken(false)
		} finally {
			setIsValidating(false)
		}
	}, [token])

	useEffect(() => {
		if (!token) {
			navigate('/forgot-password')
			return
		}

		validateToken()
	}, [token, navigate, validateToken])

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {}
		
		if (!password) {
			newErrors.password = 'Password is required'
		} else if (password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters'
		}
		
		if (!confirmPassword) {
			newErrors.confirmPassword = 'Please confirm your password'
		} else if (password !== confirmPassword) {
			newErrors.confirmPassword = 'Passwords do not match'
		}
		
		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!validateForm()) return
		
		setIsLoading(true)
		
		try {
			await authAPI.resetPassword(token!, password)
			
			addNotification('system-update', {
				title: 'Password Reset Successful',
				message: 'Your password has been reset. Please login with your new password.'
			})
			
			navigate('/login')
		} catch (error) {
			setErrors({ general: 'Failed to reset password. Please try again.' })
		} finally {
			setIsLoading(false)
		}
	}

	if (isValidating) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bp-green mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Validating reset link...</p>
				</div>
			</div>
		)
	}

	if (!isValidToken) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="w-full max-w-md"
				>
					<Card className="shadow-2xl">
						<CardBody className="px-6 py-8 text-center">
							<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
							</div>
							<h2 className="text-2xl font-bold mb-2">Invalid or Expired Link</h2>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								This password reset link is invalid or has expired. Please request a new one.
							</p>
							<Link to="/forgot-password">
								<Button
									className="w-full bg-bp-green text-white font-semibold"
									size="lg"
								>
									Request New Link
								</Button>
							</Link>
						</CardBody>
					</Card>
				</motion.div>
			</div>
		)
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
								<Lock className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold">Reset Password</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Create a new password for {tokenEmail}
						</p>
					</CardHeader>
					
					<CardBody className="px-6 py-6">
						<form onSubmit={handleSubmit} className="space-y-5">
							{errors.general && (
								<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
									<p className="text-sm text-red-700 dark:text-red-300">{errors.general}</p>
								</div>
							)}
							
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									New Password <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Lock className="w-4 h-4 text-gray-400" />
									</div>
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
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
							>
								{isLoading ? 'Resetting...' : 'Reset Password'}
							</Button>
						</form>
					</CardBody>
				</Card>
			</motion.div>
		</div>
	)
}