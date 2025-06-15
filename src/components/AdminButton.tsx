import React, { useState } from 'react'
import { Button } from '@nextui-org/react'
import { Key, Upload, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AdminLoginModal } from './AdminLoginModal'

interface AdminButtonProps {
	onNavigateToUpload?: () => void
}

export const AdminButton: React.FC<AdminButtonProps> = ({ onNavigateToUpload }) => {
	const { isAdmin, logout } = useAuth()
	const [showLoginModal, setShowLoginModal] = useState(false)

	if (isAdmin) {
		return (
			<div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
				<Button
					size="sm"
					startContent={<Upload size={16} />}
					className="bg-[#00754F] text-white shadow-lg"
					onPress={onNavigateToUpload}
				>
					Upload Data
				</Button>
				<Button
					size="sm"
					variant="bordered"
					startContent={<LogOut size={16} />}
					className="bg-white shadow-lg"
					onPress={logout}
				>
					Logout
				</Button>
			</div>
		)
	}

	return (
		<>
			<Button
				size="sm"
				variant="bordered"
				startContent={<Key size={16} />}
				className="fixed bottom-6 right-6 bg-white shadow-lg z-50"
				onPress={() => setShowLoginModal(true)}
			>
				Admin
			</Button>
			<AdminLoginModal 
				isOpen={showLoginModal} 
				onClose={() => setShowLoginModal(false)} 
			/>
		</>
	)
}