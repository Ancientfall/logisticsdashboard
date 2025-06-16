import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button } from '@nextui-org/react'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { authAPI } from '../../services/api'

export default function ForgotPassword() {
	const [email, setEmail] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!email) {
			setError('Email is required')
			return
		}
		
		if (!/\S+@\S+\.\S+/.test(email)) {
			setError('Please enter a valid email address')
			return
		}
		
		setIsLoading(true)
		setError('')
		
		try {
			await authAPI.requestPasswordReset(email)
			setIsSubmitted(true)
		} catch (err) {
			setError('Failed to send reset email. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	if (isSubmitted) {
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
							<div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
								<CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
							</div>
							<h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
							<p className="text-gray-600 dark:text-gray-400 mb-6">
								If an account exists with the email <strong>{email}</strong>, we've sent a password reset link.
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
								The link will expire in 1 hour. Be sure to check your spam folder if you don't see the email.
							</p>
							<Link to="/login">
								<Button
									className="w-full bg-bp-green text-white font-semibold"
									size="lg"
								>
									Return to Login
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
								<Mail className="w-6 h-6 text-white" />
							</div>
							<h1 className="text-2xl font-bold">Forgot Password</h1>
						</div>
						<p className="text-gray-600 dark:text-gray-400">
							Enter your email to receive a password reset link
						</p>
					</CardHeader>
					
					<CardBody className="px-6 py-6">
						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-2">
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
									Email Address <span className="text-red-500">*</span>
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
										<Mail className="w-4 h-4 text-gray-400" />
									</div>
									<input
										type="email"
										value={email}
										onChange={(e) => {
											setEmail(e.target.value)
											setError('')
										}}
										className={`w-full pl-10 pr-3 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#00754F] focus:border-[#00754F] ${
											error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
										}`}
										placeholder="john.doe@example.com"
										autoComplete="email"
										autoFocus
									/>
								</div>
								{error && (
									<p className="text-xs text-red-500 mt-1">{error}</p>
								)}
							</div>
							
							<Button
								type="submit"
								className="w-full bg-bp-green text-white font-semibold"
								size="lg"
								isLoading={isLoading}
								isDisabled={!email}
							>
								{isLoading ? 'Sending...' : 'Send Reset Link'}
							</Button>
						</form>
						
						<div className="mt-6 text-center">
							<Link 
								to="/login" 
								className="text-sm text-gray-600 dark:text-gray-400 hover:text-bp-green dark:hover:text-bp-green transition-colors inline-flex items-center gap-1"
							>
								<ArrowLeft size={16} />
								Back to Login
							</Link>
						</div>
					</CardBody>
				</Card>
			</motion.div>
		</div>
	)
}