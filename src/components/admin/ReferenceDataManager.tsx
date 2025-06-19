import React, { useState, useEffect } from 'react'
import { Button, Card, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, SelectItem, Switch } from '@nextui-org/react'
import { Plus, Edit, Trash2, Ship, Building, RefreshCw } from 'lucide-react'
import { dataAPI } from '../../services/api'

interface MasterFacility {
	id: string
	locationName: string
	facilityType: 'Production' | 'Drilling' | 'Integrated'
	parentFacility?: string
	isProductionCapable: boolean
	isDrillingCapable: boolean
	productionLCs: string[]
	region: string
	notes?: string
	isActive: boolean
}

interface VesselClassification {
	id: string
	vesselName: string
	standardizedVesselName: string
	company: string
	size: number
	vesselType: string
	vesselCategory: string
	sizeCategory: 'Small' | 'Medium' | 'Large'
	yearBuilt?: number
	flag?: string
	isActive: boolean
}

const ReferenceDataManager: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'facilities' | 'vessels'>('facilities')
	const [facilities, setFacilities] = useState<MasterFacility[]>([])
	const [vessels, setVessels] = useState<VesselClassification[]>([])
	const [loading, setLoading] = useState(false)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [editingItem, setEditingItem] = useState<any>(null)
	const [formData, setFormData] = useState<any>({})

	// Load data on mount
	useEffect(() => {
		loadData()
	}, [])

	const loadData = async () => {
		setLoading(true)
		try {
			const [facilitiesResponse, vesselsResponse] = await Promise.allSettled([
				dataAPI.getMasterFacilities({ limit: 1000 }),
				dataAPI.getVesselClassifications({ limit: 1000 })
			])

			if (facilitiesResponse.status === 'fulfilled') {
				setFacilities(facilitiesResponse.value.data || [])
			}

			if (vesselsResponse.status === 'fulfilled') {
				setVessels(vesselsResponse.value.data || [])
			}
		} catch (error) {
			console.error('Error loading reference data:', error)
		}
		setLoading(false)
	}

	const handleEdit = (item: any) => {
		setEditingItem(item)
		setFormData({ ...item })
		setIsModalOpen(true)
	}

	const handleAdd = () => {
		setEditingItem(null)
		if (activeTab === 'facilities') {
			setFormData({
				locationName: '',
				facilityType: 'Production',
				parentFacility: '',
				isProductionCapable: false,
				isDrillingCapable: false,
				productionLCs: [],
				region: 'Gulf of Mexico',
				notes: '',
				isActive: true
			})
		} else {
			setFormData({
				vesselName: '',
				standardizedVesselName: '',
				company: '',
				size: 0,
				vesselType: 'OSV',
				vesselCategory: 'Supply',
				sizeCategory: 'Medium',
				yearBuilt: new Date().getFullYear(),
				flag: 'USA',
				isActive: true
			})
		}
		setIsModalOpen(true)
	}

	const handleSave = async () => {
		try {
			// Note: This would require implementing POST/PUT endpoints
			console.log('Saving:', formData)
			setIsModalOpen(false)
			// Refresh data after save
			await loadData()
		} catch (error) {
			console.error('Error saving:', error)
		}
	}

	const handleDelete = async (id: string) => {
		if (window.confirm('Are you sure you want to delete this item?')) {
			try {
				// Note: This would require implementing DELETE endpoints
				console.log('Deleting:', id)
				// Refresh data after delete
				await loadData()
			} catch (error) {
				console.error('Error deleting:', error)
			}
		}
	}

	const renderFacilitiesTable = () => (
		<Table aria-label="Master Facilities Table">
			<TableHeader>
				<TableColumn>LOCATION NAME</TableColumn>
				<TableColumn>TYPE</TableColumn>
				<TableColumn>CAPABILITIES</TableColumn>
				<TableColumn>REGION</TableColumn>
				<TableColumn>STATUS</TableColumn>
				<TableColumn>ACTIONS</TableColumn>
			</TableHeader>
			<TableBody>
				{facilities.map((facility) => (
					<TableRow key={facility.id}>
						<TableCell>
							<div>
								<div className="font-medium">{facility.locationName}</div>
								{facility.parentFacility && (
									<div className="text-xs text-gray-500">Parent: {facility.parentFacility}</div>
								)}
							</div>
						</TableCell>
						<TableCell>
							<Chip
								color={
									facility.facilityType === 'Production' ? 'success' :
									facility.facilityType === 'Drilling' ? 'primary' : 'secondary'
								}
								size="sm"
								variant="flat"
							>
								{facility.facilityType}
							</Chip>
						</TableCell>
						<TableCell>
							<div className="flex gap-1">
								{facility.isProductionCapable && (
									<Chip size="sm" color="success" variant="dot">Production</Chip>
								)}
								{facility.isDrillingCapable && (
									<Chip size="sm" color="primary" variant="dot">Drilling</Chip>
								)}
							</div>
						</TableCell>
						<TableCell>{facility.region}</TableCell>
						<TableCell>
							<Chip
								color={facility.isActive ? 'success' : 'danger'}
								size="sm"
								variant="flat"
							>
								{facility.isActive ? 'Active' : 'Inactive'}
							</Chip>
						</TableCell>
						<TableCell>
							<div className="flex gap-2">
								<Button
									size="sm"
									color="primary"
									variant="light"
									startContent={<Edit size={16} />}
									onClick={() => handleEdit(facility)}
								>
									Edit
								</Button>
								<Button
									size="sm"
									color="danger"
									variant="light"
									startContent={<Trash2 size={16} />}
									onClick={() => handleDelete(facility.id)}
								>
									Delete
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)

	const renderVesselsTable = () => (
		<Table aria-label="Vessel Classifications Table">
			<TableHeader>
				<TableColumn>VESSEL NAME</TableColumn>
				<TableColumn>COMPANY</TableColumn>
				<TableColumn>TYPE</TableColumn>
				<TableColumn>SIZE</TableColumn>
				<TableColumn>BUILT</TableColumn>
				<TableColumn>STATUS</TableColumn>
				<TableColumn>ACTIONS</TableColumn>
			</TableHeader>
			<TableBody>
				{vessels.map((vessel) => (
					<TableRow key={vessel.id}>
						<TableCell>
							<div>
								<div className="font-medium">{vessel.vesselName}</div>
								<div className="text-xs text-gray-500">{vessel.standardizedVesselName}</div>
							</div>
						</TableCell>
						<TableCell>{vessel.company}</TableCell>
						<TableCell>
							<div>
								<Chip size="sm" color="primary" variant="flat">
									{vessel.vesselType}
								</Chip>
								<div className="text-xs text-gray-500 mt-1">{vessel.vesselCategory}</div>
							</div>
						</TableCell>
						<TableCell>
							<div>
								<div className="font-medium">{vessel.size}ft</div>
								<Chip size="sm" variant="dot" color={
									vessel.sizeCategory === 'Large' ? 'success' :
									vessel.sizeCategory === 'Medium' ? 'warning' : 'default'
								}>
									{vessel.sizeCategory}
								</Chip>
							</div>
						</TableCell>
						<TableCell>{vessel.yearBuilt || 'N/A'}</TableCell>
						<TableCell>
							<Chip
								color={vessel.isActive ? 'success' : 'danger'}
								size="sm"
								variant="flat"
							>
								{vessel.isActive ? 'Active' : 'Inactive'}
							</Chip>
						</TableCell>
						<TableCell>
							<div className="flex gap-2">
								<Button
									size="sm"
									color="primary"
									variant="light"
									startContent={<Edit size={16} />}
									onClick={() => handleEdit(vessel)}
								>
									Edit
								</Button>
								<Button
									size="sm"
									color="danger"
									variant="light"
									startContent={<Trash2 size={16} />}
									onClick={() => handleDelete(vessel.id)}
								>
									Delete
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)

	const renderEditModal = () => (
		<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
			<ModalContent>
				<ModalHeader>
					{editingItem ? 'Edit' : 'Add'} {activeTab === 'facilities' ? 'Facility' : 'Vessel'}
				</ModalHeader>
				<ModalBody>
					{activeTab === 'facilities' ? (
						<div className="space-y-4">
							<Input
								label="Location Name"
								value={formData.locationName || ''}
								onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
							/>
							<Select
								label="Facility Type"
								selectedKeys={[formData.facilityType]}
								onSelectionChange={(keys) => setFormData({ ...formData, facilityType: Array.from(keys)[0] })}
							>
								<SelectItem key="Production">Production</SelectItem>
								<SelectItem key="Drilling">Drilling</SelectItem>
								<SelectItem key="Integrated">Integrated</SelectItem>
							</Select>
							<Input
								label="Parent Facility"
								value={formData.parentFacility || ''}
								onChange={(e) => setFormData({ ...formData, parentFacility: e.target.value })}
							/>
							<Input
								label="Region"
								value={formData.region || ''}
								onChange={(e) => setFormData({ ...formData, region: e.target.value })}
							/>
							<div className="flex gap-4">
								<Switch
									isSelected={formData.isProductionCapable}
									onValueChange={(value) => setFormData({ ...formData, isProductionCapable: value })}
								>
									Production Capable
								</Switch>
								<Switch
									isSelected={formData.isDrillingCapable}
									onValueChange={(value) => setFormData({ ...formData, isDrillingCapable: value })}
								>
									Drilling Capable
								</Switch>
								<Switch
									isSelected={formData.isActive}
									onValueChange={(value) => setFormData({ ...formData, isActive: value })}
								>
									Active
								</Switch>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<Input
								label="Vessel Name"
								value={formData.vesselName || ''}
								onChange={(e) => setFormData({ ...formData, vesselName: e.target.value })}
							/>
							<Input
								label="Company"
								value={formData.company || ''}
								onChange={(e) => setFormData({ ...formData, company: e.target.value })}
							/>
							<div className="flex gap-4">
								<Select
									label="Vessel Type"
									selectedKeys={[formData.vesselType]}
									onSelectionChange={(keys) => setFormData({ ...formData, vesselType: Array.from(keys)[0] })}
								>
									<SelectItem key="OSV">OSV</SelectItem>
									<SelectItem key="FSV">FSV</SelectItem>
									<SelectItem key="AHTS">AHTS</SelectItem>
									<SelectItem key="PSV">PSV</SelectItem>
									<SelectItem key="MSV">MSV</SelectItem>
									<SelectItem key="Support">Support</SelectItem>
									<SelectItem key="Specialty">Specialty</SelectItem>
								</Select>
								<Select
									label="Size Category"
									selectedKeys={[formData.sizeCategory]}
									onSelectionChange={(keys) => setFormData({ ...formData, sizeCategory: Array.from(keys)[0] })}
								>
									<SelectItem key="Small">Small</SelectItem>
									<SelectItem key="Medium">Medium</SelectItem>
									<SelectItem key="Large">Large</SelectItem>
								</Select>
							</div>
							<div className="flex gap-4">
								<Input
									label="Size (ft)"
									type="number"
									value={formData.size?.toString() || ''}
									onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) || 0 })}
								/>
								<Input
									label="Year Built"
									type="number"
									value={formData.yearBuilt?.toString() || ''}
									onChange={(e) => setFormData({ ...formData, yearBuilt: parseInt(e.target.value) || 0 })}
								/>
								<Input
									label="Flag"
									value={formData.flag || ''}
									onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
								/>
							</div>
							<Switch
								isSelected={formData.isActive}
								onValueChange={(value) => setFormData({ ...formData, isActive: value })}
							>
								Active
							</Switch>
						</div>
					)}
				</ModalBody>
				<ModalFooter>
					<Button variant="light" onPress={() => setIsModalOpen(false)}>
						Cancel
					</Button>
					<Button color="primary" onPress={handleSave}>
						Save
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)

	return (
		<div className="p-6 space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Reference Data Management</h1>
				<div className="flex gap-3">
					<Button
						color="primary"
						variant="light"
						startContent={<RefreshCw size={18} />}
						onClick={loadData}
						isLoading={loading}
					>
						Refresh
					</Button>
					<Button
						color="primary"
						startContent={<Plus size={18} />}
						onClick={handleAdd}
					>
						Add {activeTab === 'facilities' ? 'Facility' : 'Vessel'}
					</Button>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="flex gap-4 border-b">
				<Button
					variant={activeTab === 'facilities' ? 'solid' : 'light'}
					color="primary"
					startContent={<Building size={18} />}
					onClick={() => setActiveTab('facilities')}
				>
					Master Facilities ({facilities.length})
				</Button>
				<Button
					variant={activeTab === 'vessels' ? 'solid' : 'light'}
					color="primary"
					startContent={<Ship size={18} />}
					onClick={() => setActiveTab('vessels')}
				>
					Vessel Classifications ({vessels.length})
				</Button>
			</div>

			{/* Content */}
			<Card className="p-6">
				{loading ? (
					<div className="flex justify-center items-center h-32">
						<RefreshCw className="animate-spin" size={24} />
						<span className="ml-2">Loading...</span>
					</div>
				) : (
					<div>
						{activeTab === 'facilities' ? renderFacilitiesTable() : renderVesselsTable()}
					</div>
				)}
			</Card>

			{/* Edit/Add Modal */}
			{renderEditModal()}
		</div>
	)
}

export default ReferenceDataManager