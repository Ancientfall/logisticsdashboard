import React, { useState, useEffect, useCallback } from 'react'
import { 
	Table, 
	TableHeader, 
	TableColumn, 
	TableBody, 
	TableRow, 
	TableCell,
	Button,
	Chip,
	Modal,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
	Select,
	SelectItem,
	Switch,
	Input,
	Pagination,
	Spinner
} from '@nextui-org/react'
import { Users, Shield, Activity, UserCheck, Search, RefreshCw, Database } from 'lucide-react'
import { adminAPI } from '../../services/api'
import { useNotifications } from '../../context/NotificationContext'
import ReferenceDataManager from './ReferenceDataManager'

interface User {
	id: string
	email: string
	firstName: string
	lastName: string
	role: 'admin' | 'manager' | 'viewer'
	isActive: boolean
	lastLogin: string | null
	createdAt: string
}

interface SystemStats {
	users: {
		total: number
		active: number
		inactive: number
		byRole: {
			admin: number
			manager: number
			viewer: number
		}
	}
	uploads: {
		total: number
		recent: number
	}
	recentUsers: User[]
}

export default function AdminDashboard() {
	const { addNotification } = useNotifications()
	const [users, setUsers] = useState<User[]>([])
	const [stats, setStats] = useState<SystemStats | null>(null)
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [roleFilter, setRoleFilter] = useState('')
	const [statusFilter, setStatusFilter] = useState('')
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [selectedUser, setSelectedUser] = useState<User | null>(null)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [editForm, setEditForm] = useState({
		role: '',
		isActive: true
	})

	const fetchStats = useCallback(async () => {
		try {
			const data = await adminAPI.getSystemStats()
			setStats(data)
		} catch (error) {
			addNotification('system-update', {
				title: 'Error',
				message: 'Failed to fetch system statistics'
			})
		}
	}, [addNotification])

	const fetchUsers = useCallback(async () => {
		setLoading(true)
		try {
			const response = await adminAPI.getUsers({
				page: currentPage,
				search: searchTerm,
				role: roleFilter,
				isActive: statusFilter
			})
			setUsers(response.data)
			setTotalPages(response.pagination.pages)
		} catch (error) {
			addNotification('system-update', {
				title: 'Error',
				message: 'Failed to fetch users'
			})
		} finally {
			setLoading(false)
		}
	}, [currentPage, searchTerm, roleFilter, statusFilter, addNotification])

	useEffect(() => {
		fetchStats()
		fetchUsers()
	}, [fetchStats, fetchUsers])

	const handleEditUser = (user: User) => {
		setSelectedUser(user)
		setEditForm({
			role: user.role,
			isActive: user.isActive
		})
		setIsEditModalOpen(true)
	}

	const handleUpdateUser = async () => {
		if (!selectedUser) return

		try {
			await adminAPI.updateUser(selectedUser.id, editForm)
			addNotification('system-update', {
				title: 'Success',
				message: 'User updated successfully'
			})
			setIsEditModalOpen(false)
			fetchUsers()
			fetchStats()
		} catch (error) {
			addNotification('system-update', {
				title: 'Error',
				message: 'Failed to update user'
			})
		}
	}

	const getRoleColor = (role: string) => {
		switch (role) {
			case 'admin':
				return 'danger'
			case 'manager':
				return 'warning'
			default:
				return 'default'
		}
	}

	const getStatusColor = (isActive: boolean) => {
		return isActive ? 'success' : 'danger'
	}

	return (
		<div className="space-y-6 min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Admin Dashboard
				</h1>
				<p className="text-gray-600">
					Manage users and monitor system activity
				</p>
			</div>

			{/* Stats Cards */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
								<Users className="w-6 h-6 text-white" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Total Users</p>
								<p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
							</div>
						</div>
					</div>

					<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md">
								<UserCheck className="w-6 h-6 text-white" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Active Users</p>
								<p className="text-2xl font-bold text-gray-900">{stats.users.active}</p>
							</div>
						</div>
					</div>

					<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md">
								<Shield className="w-6 h-6 text-white" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Admins</p>
								<p className="text-2xl font-bold text-gray-900">{stats.users.byRole.admin || 0}</p>
							</div>
						</div>
					</div>

					<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50 p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
								<Activity className="w-6 h-6 text-white" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-600">Recent Uploads</p>
								<p className="text-2xl font-bold text-gray-900">{stats.uploads.recent}</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* User Management */}
			<div className="bg-white/90 backdrop-blur-md shadow-sm rounded-xl border border-gray-200/50">
				<div className="p-6 border-b border-gray-200/50">
					<div className="flex justify-between items-center w-full">
						<h2 className="text-xl font-semibold text-gray-900">User Management</h2>
						<Button
							size="sm"
							className="bg-gray-100 hover:bg-gray-200 text-gray-700"
							startContent={<RefreshCw size={16} />}
							onClick={() => {
								fetchUsers()
								fetchStats()
							}}
						>
							Refresh
						</Button>
					</div>
				</div>
				<div className="p-6">
					{/* Filters */}
					<div className="flex gap-4 mb-6 flex-wrap">
						<Input
							placeholder="Search users..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							startContent={<Search size={16} />}
							className="max-w-xs"
							classNames={{
								input: "bg-gray-50 text-gray-900",
								inputWrapper: "bg-gray-50 border-gray-200 hover:border-gray-300 focus-within:border-bp-green"
							}}
						/>
						<Select
							placeholder="Filter by role"
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							className="max-w-xs"
							classNames={{
								trigger: "bg-gray-50 border-gray-200 hover:border-gray-300 data-[focus=true]:border-bp-green",
								value: "text-gray-900"
							}}
						>
							<SelectItem key="" value="">All Roles</SelectItem>
							<SelectItem key="admin" value="admin">Admin</SelectItem>
							<SelectItem key="manager" value="manager">Manager</SelectItem>
							<SelectItem key="viewer" value="viewer">Viewer</SelectItem>
						</Select>
						<Select
							placeholder="Filter by status"
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="max-w-xs"
							classNames={{
								trigger: "bg-gray-50 border-gray-200 hover:border-gray-300 data-[focus=true]:border-bp-green",
								value: "text-gray-900"
							}}
						>
							<SelectItem key="" value="">All Status</SelectItem>
							<SelectItem key="true" value="true">Active</SelectItem>
							<SelectItem key="false" value="false">Inactive</SelectItem>
						</Select>
					</div>

					{/* Users Table */}
					{loading ? (
						<div className="flex justify-center py-8">
							<Spinner size="lg" />
						</div>
					) : (
						<>
							<Table 
								aria-label="Users table"
								classNames={{
									wrapper: "bg-white/50 border border-gray-200 rounded-xl shadow-sm",
									th: "bg-gray-100/50 text-gray-700 font-semibold",
									td: "text-gray-900"
								}}
							>
								<TableHeader>
									<TableColumn>NAME</TableColumn>
									<TableColumn>EMAIL</TableColumn>
									<TableColumn>ROLE</TableColumn>
									<TableColumn>STATUS</TableColumn>
									<TableColumn>LAST LOGIN</TableColumn>
									<TableColumn>JOINED</TableColumn>
									<TableColumn>ACTIONS</TableColumn>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow key={user.id}>
											<TableCell>
												{user.firstName} {user.lastName}
											</TableCell>
											<TableCell>{user.email}</TableCell>
											<TableCell>
												<Chip
													color={getRoleColor(user.role)}
													variant="flat"
													size="sm"
												>
													{user.role}
												</Chip>
											</TableCell>
											<TableCell>
												<Chip
													color={getStatusColor(user.isActive)}
													variant="dot"
													size="sm"
												>
													{user.isActive ? 'Active' : 'Inactive'}
												</Chip>
											</TableCell>
											<TableCell>
												{user.lastLogin 
													? new Date(user.lastLogin).toLocaleDateString()
													: 'Never'
												}
											</TableCell>
											<TableCell>
												{new Date(user.createdAt).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<Button
													size="sm"
													variant="flat"
													onClick={() => handleEditUser(user)}
												>
													Edit
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							{totalPages > 1 && (
								<div className="flex justify-center mt-4">
									<Pagination
										total={totalPages}
										page={currentPage}
										onChange={setCurrentPage}
									/>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Edit User Modal */}
			<Modal 
				isOpen={isEditModalOpen} 
				onClose={() => setIsEditModalOpen(false)}
				classNames={{
					base: "bg-white",
					backdrop: "bg-black/50"
				}}
			>
				<ModalContent>
					<ModalHeader className="text-gray-900 border-b border-gray-200">
						Edit User: {selectedUser?.firstName} {selectedUser?.lastName}
					</ModalHeader>
					<ModalBody>
						<div className="space-y-4">
							<Select
								label="Role"
								selectedKeys={[editForm.role]}
								onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
							>
								<SelectItem key="admin" value="admin">Admin</SelectItem>
								<SelectItem key="manager" value="manager">Manager</SelectItem>
								<SelectItem key="viewer" value="viewer">Viewer</SelectItem>
							</Select>
							<div className="flex items-center justify-between">
								<span>Account Status</span>
								<Switch
									isSelected={editForm.isActive}
									onValueChange={(value) => setEditForm({ ...editForm, isActive: value })}
									color="success"
								>
									{editForm.isActive ? 'Active' : 'Inactive'}
								</Switch>
							</div>
						</div>
					</ModalBody>
					<ModalFooter>
						<Button variant="light" onClick={() => setIsEditModalOpen(false)}>
							Cancel
						</Button>
						<Button color="primary" onClick={handleUpdateUser}>
							Save Changes
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</div>
	)
}