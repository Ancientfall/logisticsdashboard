import React, { useState } from 'react'
import {
	Upload,
	X,
	AlertCircle,
	Eye,
	RefreshCw,
	TrendingUp,
	Zap,
	FileCheck,
	FileSpreadsheet,
	Ship,
	DollarSign,
	ClipboardList,
	Package
} from 'lucide-react'
// import { motion } from 'framer-motion'
import { Button, Progress, Card, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react'
import { ExcelValidator } from '../../utils/excel/excelValidator'
import { useNotifications } from '../../context/NotificationContext'
import { useData } from '../../context/DataContext'
import { processExcelFiles } from '../../utils/dataProcessing'

interface FileUploadState {
	voyageEvents: File | null
	costAllocation: File | null
	voyageList: File | null
	vesselManifests: File | null
	bulkActions: File | null
}

interface ProcessingProgress {
	voyageEvents: number
	costAllocation: number
	voyageList: number
	vesselManifests: number
	bulkActions: number
}

interface FilePreview {
	file: File
	fileType: keyof FileUploadState
	rowCount: number
	columnCount: number
	headers: string[]
	sampleData: any[]
}

const EnhancedFileUploadFixed: React.FC = () => {
	const [files, setFiles] = useState<FileUploadState>({
		voyageEvents: null,
		costAllocation: null,
		voyageList: null,
		vesselManifests: null,
		bulkActions: null
	})
	
	const [uploadProgress, setUploadProgress] = useState<ProcessingProgress>({
		voyageEvents: 0,
		costAllocation: 0,
		voyageList: 0,
		vesselManifests: 0,
		bulkActions: 0
	})
	
	const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState('')
	const [showPreview, setShowPreview] = useState(false)
	const [currentPreview, setCurrentPreview] = useState<FilePreview | null>(null)
	const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('update')
	
	const { addNotification } = useNotifications()
	const { 
		setVoyageEvents,
		setVesselManifests,
		setMasterFacilities,
		setCostAllocation,
		setVoyageList,
		setVesselClassifications,
		setBulkActions,
		clearAllData,
		setIsDataReady,
		setIsLoading,
		setError
	} = useData()

	const fileTypeInfo = {
		voyageEvents: {
			label: 'Voyage Events',
			icon: Ship,
			color: 'primary' as const,
			required: true,
			description: 'Mission events, locations, and hours'
		},
		costAllocation: {
			label: 'Cost Allocation',
			icon: DollarSign,
			color: 'success' as const,
			required: true,
			description: 'LC numbers and cost breakdowns'
		},
		voyageList: {
			label: 'Voyage List',
			icon: ClipboardList,
			color: 'secondary' as const,
			required: false,
			description: 'Voyage details and metadata'
		},
		vesselManifests: {
			label: 'Vessel Manifests',
			icon: FileSpreadsheet,
			color: 'warning' as const,
			required: false,
			description: 'Vessel operations and manifest data'
		},
		bulkActions: {
			label: 'Bulk Actions',
			icon: Package,
			color: 'default' as const,
			required: false,
			description: 'Bulk fluid transfers and operations'
		}
	}

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: keyof FileUploadState) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0]
			
			// Validate file type
			if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
				addNotification('system-update', {
					version: 'File Validation'
				}, {
					title: 'Invalid File Type',
					message: `${fileTypeInfo[fileType].label} must be an Excel or CSV file`,
					priority: 'error'
				})
				return
			}
			
			// Check file size
			if (file.size > 50 * 1024 * 1024) {
				addNotification('storage-warning', {
					percentage: '100'
				}, {
					message: `${file.name} exceeds 50MB limit`
				})
				return
			}
			
			// Update files state
			setFiles(prev => ({
				...prev,
				[fileType]: file
			}))
			
			// Simulate upload progress
			setUploadProgress(prev => ({ ...prev, [fileType]: 0 }))
			const interval = setInterval(() => {
				setUploadProgress(prev => {
					const current = prev[fileType]
					if (current >= 100) {
						clearInterval(interval)
						return prev
					}
					return { ...prev, [fileType]: Math.min(current + 20, 100) }
				})
			}, 100)
		}
	}

	const handleDrop = (e: React.DragEvent, fileType: keyof FileUploadState) => {
		e.preventDefault()
		e.stopPropagation()
		
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0]
			const input = { target: { files: [file] } } as any
			handleFileChange(input, fileType)
		}
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}

	const removeFile = (fileType: keyof FileUploadState) => {
		setFiles(prev => ({ ...prev, [fileType]: null }))
		setUploadProgress(prev => ({ ...prev, [fileType]: 0 }))
	}

	const previewFile = async (fileType: keyof FileUploadState) => {
		const file = files[fileType]
		if (!file) return
		
		try {
			const preview = await ExcelValidator.getPreview(file, 10)
			setCurrentPreview({
				file,
				fileType,
				rowCount: preview.rowCount,
				columnCount: preview.headers.length,
				headers: preview.headers,
				sampleData: preview.data
			})
			setShowPreview(true)
		} catch (error) {
			addNotification('system-update', {
				version: 'File Preview'
			}, {
				title: 'Preview Error',
				message: `Error previewing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
				priority: 'error'
			})
		}
	}

	const processFiles = async () => {
		// Check required files
		if (!files.voyageEvents || !files.costAllocation) {
			addNotification('processing-complete', {
				totalRecords: 0,
				duration: '0s'
			}, {
				message: 'Voyage Events and Cost Allocation files are required',
				priority: 'error'
			})
			return
		}
		
		setProcessingStatus('processing')
		setIsLoading(true)
		setErrorMessage('')
		const processingStartTime = Date.now()
		
		// Reset all progress
		setUploadProgress({
			voyageEvents: 0,
			costAllocation: 0,
			voyageList: 0,
			vesselManifests: 0,
			bulkActions: 0
		})
		
		try {
			// Clear data if in replace mode
			if (uploadMode === 'replace') {
				clearAllData()
			}
			
			// Simulate processing progress
			const progressInterval = setInterval(() => {
				setUploadProgress(prev => ({
					voyageEvents: Math.min(prev.voyageEvents + 10, 90),
					costAllocation: Math.min(prev.costAllocation + 10, 90),
					voyageList: files.voyageList ? Math.min(prev.voyageList + 10, 90) : 0,
					vesselManifests: files.vesselManifests ? Math.min(prev.vesselManifests + 10, 90) : 0,
					bulkActions: files.bulkActions ? Math.min(prev.bulkActions + 10, 90) : 0
				}))
			}, 300)
			
			// Process Excel files using the same function as the original
			const dataStore = await processExcelFiles({
				voyageEventsFile: files.voyageEvents,
				voyageListFile: files.voyageList,
				vesselManifestsFile: files.vesselManifests,
				costAllocationFile: files.costAllocation,
				vesselClassificationsFile: null,
				bulkActionsFile: files.bulkActions,
				useMockData: false
			})
			
			clearInterval(progressInterval)
			
			// Set progress to 100%
			setUploadProgress({
				voyageEvents: 100,
				costAllocation: 100,
				voyageList: files.voyageList ? 100 : 0,
				vesselManifests: files.vesselManifests ? 100 : 0,
				bulkActions: files.bulkActions ? 100 : 0
			})
			
			// Update individual data arrays (same as original)
			setVoyageEvents(dataStore.voyageEvents)
			setVesselManifests(dataStore.vesselManifests)
			setMasterFacilities(dataStore.masterFacilities)
			setCostAllocation(dataStore.costAllocation)
			setVoyageList(dataStore.voyageList)
			setVesselClassifications(dataStore.vesselClassifications || [])
			setBulkActions(dataStore.bulkActions || [])
			
			setIsDataReady(true)
			setProcessingStatus('success')
			
			addNotification('processing-complete', {
				totalRecords: dataStore.voyageEvents.length + dataStore.costAllocation.length,
				duration: `${Math.round((Date.now() - processingStartTime) / 1000)}s`
			}, {
				message: `Successfully processed ${dataStore.voyageEvents.length} voyage events and ${dataStore.costAllocation.length} cost allocations`
			})
			
		} catch (error) {
			console.error('Error processing files:', error)
			setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
			setProcessingStatus('error')
			setError(error instanceof Error ? error.message : String(error))
			
			addNotification('processing-complete', {
				totalRecords: 0,
				duration: '0s'
			}, {
				message: `Error: ${error instanceof Error ? error.message : 'Processing failed'}`,
				priority: 'error'
			})
		} finally {
			setIsLoading(false)
		}
	}

	const hasRequiredFiles = files.voyageEvents !== null && files.costAllocation !== null
	const isProcessing = processingStatus === 'processing'

	// File upload component for each type
	const FileUploadZone = ({ fileType }: { fileType: keyof FileUploadState }) => {
		const info = fileTypeInfo[fileType]
		const file = files[fileType]
		const progress = uploadProgress[fileType]
		const Icon = info.icon
		
		return (
			<div 
				className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
					file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
				}`}
				onDragOver={handleDragOver}
				onDrop={(e) => handleDrop(e, fileType)}
			>
				<div className="flex items-start gap-4">
					<div className={`p-3 rounded-lg bg-gradient-to-br ${
						file ? 'from-green-400 to-green-600' : 'from-gray-400 to-gray-600'
					}`}>
						<Icon className="text-white" size={24} />
					</div>
					
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<h4 className="font-semibold text-gray-900">
								{info.label}
								{info.required && <span className="text-red-500 ml-1">*</span>}
							</h4>
							{file && (
								<Chip size="sm" color="success" variant="flat">
									<FileCheck size={14} className="mr-1" />
									Ready
								</Chip>
							)}
						</div>
						
						<p className="text-sm text-gray-600 mb-3">{info.description}</p>
						
						{file ? (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-700">{file.name}</span>
									<span className="text-sm text-gray-500">
										{(file.size / 1024 / 1024).toFixed(2)} MB
									</span>
								</div>
								
								{progress > 0 && progress < 100 && (
									<Progress value={progress} size="sm" color="success" />
								)}
								
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="flat"
										onClick={() => previewFile(fileType)}
										startContent={<Eye size={14} />}
									>
										Preview
									</Button>
									<Button
										size="sm"
										variant="flat"
										color="danger"
										onClick={() => removeFile(fileType)}
										startContent={<X size={14} />}
										disabled={isProcessing}
									>
										Remove
									</Button>
								</div>
							</div>
						) : (
							<div>
								<input
									type="file"
									accept=".xlsx,.xls,.csv"
									onChange={(e) => handleFileChange(e, fileType)}
									className="hidden"
									id={`file-input-${fileType}`}
									disabled={isProcessing}
								/>
								<label
									htmlFor={`file-input-${fileType}`}
									className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
								>
									<Upload size={16} />
									Choose File
								</label>
								<span className="ml-3 text-sm text-gray-500">or drag and drop</span>
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="mb-8">
				<h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Data Files</h2>
				<p className="text-gray-600">Upload your Excel files in the correct format for each data type</p>
			</div>

			{/* Upload Mode Selection */}
			<Card className="mb-6 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-semibold text-gray-900 mb-1">Upload Mode</h3>
						<p className="text-sm text-gray-600">Choose how to handle existing data</p>
					</div>
					<div className="flex gap-2">
						<Button
							size="sm"
							color={uploadMode === 'update' ? 'primary' : 'default'}
							variant={uploadMode === 'update' ? 'solid' : 'flat'}
							onClick={() => setUploadMode('update')}
							startContent={<TrendingUp size={16} />}
							disabled={isProcessing}
						>
							Update
						</Button>
						<Button
							size="sm"
							color={uploadMode === 'replace' ? 'danger' : 'default'}
							variant={uploadMode === 'replace' ? 'solid' : 'flat'}
							onClick={() => setUploadMode('replace')}
							startContent={<RefreshCw size={16} />}
							disabled={isProcessing}
						>
							Replace All
						</Button>
					</div>
				</div>
			</Card>

			{/* File Upload Zones */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<FileUploadZone fileType="voyageEvents" />
				<FileUploadZone fileType="costAllocation" />
				<FileUploadZone fileType="voyageList" />
				<FileUploadZone fileType="vesselManifests" />
				<FileUploadZone fileType="bulkActions" />
			</div>

			{/* Error Message */}
			{errorMessage && (
				<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-center gap-2 text-red-700">
						<AlertCircle size={20} />
						<span className="font-medium">{errorMessage}</span>
					</div>
				</div>
			)}

			{/* Process Button */}
			<div className="flex justify-center">
				<Button
					size="lg"
					color="success"
					onClick={processFiles}
					disabled={!hasRequiredFiles || isProcessing}
					isLoading={isProcessing}
					startContent={!isProcessing && <Zap size={20} />}
					className="px-8"
				>
					{isProcessing ? 'Processing Files...' : 'Process All Files'}
				</Button>
			</div>

			{/* Helper Text */}
			{!hasRequiredFiles && (
				<p className="text-center text-sm text-gray-500 mt-4">
					* Voyage Events and Cost Allocation files are required
				</p>
			)}

			{/* Preview Modal */}
			<Modal 
				isOpen={showPreview} 
				onOpenChange={setShowPreview}
				size="5xl"
				scrollBehavior="inside"
			>
				<ModalContent>
					{(onClose) => (
						<>
							<ModalHeader className="flex flex-col gap-1">
								<h3>Data Preview - {currentPreview && fileTypeInfo[currentPreview.fileType].label}</h3>
								{currentPreview && (
									<p className="text-sm text-gray-500 font-normal">
										{currentPreview.file.name} - {currentPreview.rowCount} rows × {currentPreview.columnCount} columns
									</p>
								)}
							</ModalHeader>
							<ModalBody>
								{currentPreview && (
									<div className="overflow-x-auto">
										<table className="min-w-full">
											<thead>
												<tr className="border-b bg-gray-50">
													{currentPreview.headers.map((header, i) => (
														<th key={i} className="px-4 py-2 text-left text-sm font-medium text-gray-900">
															{header}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{currentPreview.sampleData.map((row, i) => (
													<tr key={i} className="border-b hover:bg-gray-50">
														{currentPreview.headers.map((header, j) => (
															<td key={j} className="px-4 py-2 text-sm text-gray-700">
																{row[header] || '-'}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
										{currentPreview.rowCount > 10 && (
											<p className="text-sm text-gray-500 mt-2 text-center">
												Showing first 10 rows of {currentPreview.rowCount}
											</p>
										)}
									</div>
								)}
							</ModalBody>
							<ModalFooter>
								<Button color="primary" onPress={onClose}>
									Close
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>
		</div>
	)
}

export default EnhancedFileUploadFixed