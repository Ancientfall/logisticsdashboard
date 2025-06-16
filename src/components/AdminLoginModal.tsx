import React, { useState } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@nextui-org/react'
import { Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

interface AdminLoginModalProps {
	isOpen: boolean
	onClose: () => void
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const { login, loginAttempts, isLocked, lockoutTime } = useAuth()
	const { addCustomNotification } = useNotifications()
	const maxAttempts = parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5')

	const handleLogin = () => {
		if (isLocked) {
			const remainingTime = lockoutTime ? Math.ceil((lockoutTime - Date.now()) / 60000) : 0
			setError(`Account locked. Try again in ${remainingTime} minutes.`)
			return
		}

		if (login(password)) {
			addCustomNotification({
				type: 'system',
				subType: 'system-update',
				priority: 'success',
				title: 'Login Successful',
				message: 'Successfully logged in as admin',
				isRead: false
			})
			setPassword('')
			setError('')
			onClose()
		} else {
			const remainingAttempts = maxAttempts - loginAttempts - 1
			if (remainingAttempts > 0) {
				setError(`Invalid password. ${remainingAttempts} attempts remaining.`)
			} else {
				setError('Account locked due to too many failed attempts.')
			}
			addCustomNotification({
				type: 'system',
				subType: 'system-update',
				priority: 'error',
				title: 'Login Failed',
				message: isLocked ? 'Account locked' : 'Invalid admin password',
				isRead: false
			})
		}
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleLogin()
		}
	}

	return (
		<Modal 
			isOpen={isOpen} 
			onClose={() => {
				setPassword('')
				setError('')
				onClose()
			}}
			placement="center"
			backdrop="blur"
			classNames={{
				base: "bg-white z-[9999]",
				backdrop: "z-[9998] bg-black/50",
				wrapper: "z-[9999] overflow-hidden",
				header: "border-b border-gray-200",
				body: "py-6",
				footer: "border-t border-gray-200"
			}}
		>
			<ModalContent>
				<ModalHeader className="flex flex-col gap-1">
					<h3 className="text-xl font-semibold text-gray-900">Admin Login</h3>
					<p className="text-sm text-gray-600">Enter admin password to access upload features</p>
				</ModalHeader>
				<ModalBody>
					{isLocked && lockoutTime && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-sm text-red-700">
								Account locked due to too many failed attempts. 
								Try again in {Math.ceil((lockoutTime - Date.now()) / 60000)} minutes.
							</p>
						</div>
					)}
					<Input
						type="password"
						label="Admin Password"
						value={password}
						onChange={(e) => {
							setPassword(e.target.value)
							setError('')
						}}
						onKeyPress={handleKeyPress}
						isInvalid={!!error}
						errorMessage={error}
						isDisabled={isLocked}
						startContent={
							<div className="pr-1">
								<Lock className="w-4 h-4 text-gray-400" />
							</div>
						}
						classNames={{
							input: "text-gray-900",
							inputWrapper: "bg-gray-50 border-gray-300 hover:border-gray-400",
							label: "text-gray-700"
						}}
					/>
					{!isLocked && loginAttempts > 0 && loginAttempts < maxAttempts && (
						<p className="text-xs text-gray-500 mt-2">
							{maxAttempts - loginAttempts} login attempts remaining
						</p>
					)}
				</ModalBody>
				<ModalFooter>
					<Button 
						color="default" 
						variant="light" 
						onPress={() => {
							setPassword('')
							setError('')
							onClose()
						}}
					>
						Cancel
					</Button>
					<Button 
						className="bg-[#00754F] text-white"
						onPress={handleLogin}
						isDisabled={!password || isLocked}
					>
						{isLocked ? 'Locked' : 'Login'}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}