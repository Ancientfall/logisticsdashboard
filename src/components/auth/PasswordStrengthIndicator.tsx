import React from 'react'
import { Check, X } from 'lucide-react'

interface PasswordRequirement {
	met: boolean
	text: string
}

interface PasswordStrengthIndicatorProps {
	password: string
	showRequirements?: boolean
}

export default function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
	const requirements: PasswordRequirement[] = [
		{
			met: password.length >= 8,
			text: 'At least 8 characters'
		},
		{
			met: /[A-Z]/.test(password),
			text: 'One uppercase letter'
		},
		{
			met: /[a-z]/.test(password),
			text: 'One lowercase letter'
		},
		{
			met: /[0-9]/.test(password),
			text: 'One number'
		},
		{
			met: /[!@#$%^&*]/.test(password),
			text: 'One special character (!@#$%^&*)'
		}
	]

	const metRequirements = requirements.filter(req => req.met).length
	const strength = metRequirements === 0 ? 0 : (metRequirements / requirements.length) * 100

	const getStrengthColor = () => {
		if (strength === 0) return 'bg-gray-200'
		if (strength < 40) return 'bg-red-500'
		if (strength < 60) return 'bg-orange-500'
		if (strength < 80) return 'bg-yellow-500'
		return 'bg-green-500'
	}

	const getStrengthText = () => {
		if (strength === 0) return ''
		if (strength < 40) return 'Weak'
		if (strength < 60) return 'Fair'
		if (strength < 80) return 'Good'
		return 'Strong'
	}

	if (!password && !showRequirements) return null

	return (
		<div className="space-y-2">
			{password && (
				<div>
					<div className="flex justify-between items-center mb-1">
						<span className="text-xs font-medium text-gray-700 dark:text-gray-300">
							Password Strength
						</span>
						<span className="text-xs font-medium text-gray-700 dark:text-gray-300">
							{getStrengthText()}
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
							style={{ width: `${strength}%` }}
						/>
					</div>
				</div>
			)}

			{showRequirements && (
				<div className="space-y-1 mt-3">
					<p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
						Password must contain:
					</p>
					{requirements.map((req, index) => (
						<div
							key={index}
							className={`flex items-center gap-2 text-xs ${
								password && req.met
									? 'text-green-600 dark:text-green-400'
									: 'text-gray-500 dark:text-gray-400'
							}`}
						>
							{password ? (
								req.met ? (
									<Check size={14} className="flex-shrink-0" />
								) : (
									<X size={14} className="flex-shrink-0" />
								)
							) : (
								<div className="w-3.5 h-3.5" />
							)}
							<span>{req.text}</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}