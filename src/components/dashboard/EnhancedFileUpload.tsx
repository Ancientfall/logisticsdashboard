import React, { useState, useCallback, useRef } from 'react'
import {
	Upload,
	X,
	AlertCircle,
	CheckCircle,
	Loader2,
	Eye,
	RefreshCw,
	TrendingUp,
	Zap,
	FileCheck
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button, Progress, Card, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react'
import { ExcelValidator } from '../../utils/excel/excelValidator'
import { useNotifications } from '../../context/NotificationContext'
import { useData } from '../../context/DataContext'
import { processExcelFiles } from '../../utils/dataProcessing'

interface FileUploadItem {
	id: string
	file: File
	type: 'voyage_events' | 'cost_allocation' | 'voyage_list' | 'vessel_manifests' | null
	status: 'pending' | 'validating' | 'processing' | 'complete' | 'error'
	progress: number
	error?: string
	preview?: {
		rowCount: number
		columnCount: number
		sampleData: any[]
		headers: string[]
	}
	result?: {
		recordsProcessed: number
		recordsSkipped: number
		warnings: string[]
	}
}

interface ProcessingStats {
	totalFiles: number
	completedFiles: number
	totalRecords: number
	processedRecords: number
	estimatedTimeRemaining: number
	currentFile?: string
	currentStage?: string
}

const EnhancedFileUpload: React.FC = () => {
	const [files, setFiles] = useState<FileUploadItem[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [showPreview, setShowPreview] = useState(false)
	const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
	const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null)
	const [uploadMode, setUploadMode] = useState<'replace' | 'update'>('update')
	
	const { addNotification } = useNotifications()
	const { 
		setVoyageEvents,
		setVesselManifests,
		setCostAllocation,
		setVoyageList,
		clearAllData,
		setIsDataReady
	} = useData()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const processingStartTime = useRef<number>(0)

	const fileTypeMapping = {
		'voyage_events': {
			name: 'Voyage Events',
			icon: '🚢',
			color: 'primary',
			requiredHeaders: ['Voyage No', 'Event', 'Date']
		},
		'cost_allocation': {
			name: 'Cost Allocation',
			icon: '💰',
			color: 'success',
			requiredHeaders: ['Amount', 'Category', 'Voyage']
		},
		'voyage_list': {
			name: 'Voyage List',
			icon: '📋',
			color: 'secondary',
			requiredHeaders: ['Voyage ID', 'Vessel', 'Status']
		},
		'vessel_manifests': {
			name: 'Vessel Manifests',
			icon: '📦',
			color: 'warning',
			requiredHeaders: ['Vessel', 'Manifest ID', 'Date']
		}
	}

	const detectFileType = async (file: File): Promise<'voyage_events' | 'cost_allocation' | 'voyage_list' | 'vessel_manifests' | null> => {
		try {
			const preview = await ExcelValidator.getPreview(file, 5)
			const headers = preview.headers.map(h => h.toLowerCase())
			
			// Smart detection based on headers
			if (headers.some(h => h.includes('voyage') && h.includes('event'))) {
				return 'voyage_events'
			} else if (headers.some(h => h.includes('cost') || h.includes('allocation'))) {
				return 'cost_allocation'
			} else if (headers.some(h => h.includes('voyage') && h.includes('list'))) {
				return 'voyage_list'
			} else if (headers.some(h => h.includes('vessel') || h.includes('manifest'))) {
				return 'vessel_manifests'
			}
			
			return null
		} catch (error) {
			return null
		}
	}

	const handleFiles = useCallback(async (fileList: FileList) => {
		const newFiles: FileUploadItem[] = []
		
		for (let i = 0; i < fileList.length; i++) {
			const file = fileList[i]
			
			// Validate file type
			if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
				addNotification('system-update', { message: `${file.name} is not a valid Excel file` })
				continue
			}
			
			// Check file size
			if (file.size > 50 * 1024 * 1024) {
				addNotification('storage-warning', { message: `${file.name} exceeds 50MB limit` })
				continue
			}
			
			const fileItem: FileUploadItem = {
				id: `${Date.now()}-${i}`,
				file,
				type: null,
				status: 'pending',
				progress: 0
			}
			
			newFiles.push(fileItem)
		}
		
		setFiles(prev => [...prev, ...newFiles])
		
		// Start type detection for new files
		for (const fileItem of newFiles) {
			detectAndValidateFile(fileItem)
		}
	}, [addNotification])

	const detectAndValidateFile = async (fileItem: FileUploadItem) => {
		setFiles(prev => prev.map(f => 
			f.id === fileItem.id ? { ...f, status: 'validating', progress: 20 } : f
		))
		
		try {
			// Detect file type
			const detectedType = await detectFileType(fileItem.file)
			
			if (!detectedType) {
				throw new Error('Unable to detect file type. Please ensure headers match expected format.')
			}
			
			// Get preview data
			const preview = await ExcelValidator.getPreview(fileItem.file, 10)
			
			setFiles(prev => prev.map(f => 
				f.id === fileItem.id ? { 
					...f, 
					type: detectedType,
					status: 'pending',
					progress: 100,
					preview: {
						rowCount: preview.rowCount,
						columnCount: preview.headers.length,
						sampleData: preview.data,
						headers: preview.headers
					}
				} : f
			))
			
		} catch (error) {
			setFiles(prev => prev.map(f => 
				f.id === fileItem.id ? { 
					...f, 
					status: 'error',
					progress: 0,
					error: error instanceof Error ? error.message : 'Validation failed'
				} : f
			))
		}
	}

	const processFiles = async () => {
		const validFiles = files.filter(f => f.status === 'pending' && f.type)
		
		if (validFiles.length === 0) {
			addNotification('processing-complete', { message: 'No valid files to process' })
			return
		}
		
		// Check storage quota
		try {
			if (navigator.storage && navigator.storage.estimate) {
				const estimate = await navigator.storage.estimate()
				const usage = (estimate.usage || 0) / (estimate.quota || 1)
				if (usage > 0.9) {
					addNotification('storage-warning', { message: 'Storage is nearly full. Consider clearing old data first.' })
				}
			}
		} catch (error) {
			console.warn('Could not check storage quota:', error)
		}
		
		setIsProcessing(true)
		processingStartTime.current = Date.now()
		
		// Initialize processing stats
		setProcessingStats({
			totalFiles: validFiles.length,
			completedFiles: 0,
			totalRecords: validFiles.reduce((sum, f) => sum + (f.preview?.rowCount || 0), 0),
			processedRecords: 0,
			estimatedTimeRemaining: 0
		})
		
		try {
			for (let i = 0; i < validFiles.length; i++) {
				const fileItem = validFiles[i]
				
				setFiles(prev => prev.map(f => 
					f.id === fileItem.id ? { ...f, status: 'processing', progress: 0 } : f
				))
				
				setProcessingStats(prev => prev ? {
					...prev,
					currentFile: fileItem.file.name,
					currentStage: 'Reading file...'
				} : null)
				
				// Simulate progress during processing
				const progressInterval = setInterval(() => {
					setFiles(prev => prev.map(f => 
						f.id === fileItem.id && f.status === 'processing' 
							? { ...f, progress: Math.min(f.progress + 10, 90) } 
							: f
					))
				}, 500)
				
				try {
					// Process the file
					const processingOptions: any = {
						voyageEventsFile: fileItem.type === 'voyage_events' ? fileItem.file : null,
						costAllocationFile: fileItem.type === 'cost_allocation' ? fileItem.file : null,
						voyageListFile: fileItem.type === 'voyage_list' ? fileItem.file : null,
						vesselManifestsFile: fileItem.type === 'vessel_manifests' ? fileItem.file : null
					}
					const result = await processExcelFiles(processingOptions)
					
					clearInterval(progressInterval)
					
					// Update with results
					let recordsProcessed = 0
					switch(fileItem.type) {
						case 'voyage_events':
							recordsProcessed = result.voyageEvents?.length || 0
							break
						case 'cost_allocation':
							recordsProcessed = result.costAllocation?.length || 0
							break
						case 'voyage_list':
							recordsProcessed = result.voyageList?.length || 0
							break
						case 'vessel_manifests':
							recordsProcessed = result.vesselManifests?.length || 0
							break
					}
					
					setFiles(prev => prev.map(f => 
						f.id === fileItem.id ? { 
							...f, 
							status: 'complete',
							progress: 100,
							result: {
								recordsProcessed,
								recordsSkipped: 0,
								warnings: []
							}
						} : f
					))
					
					// Update global state if needed
					if (uploadMode === 'replace' && i === 0) {
						clearAllData()
					}
					
					// Store the processed data
					switch(fileItem.type) {
						case 'voyage_events':
							if (result.voyageEvents) setVoyageEvents(result.voyageEvents)
							break
						case 'cost_allocation':
							if (result.costAllocation) setCostAllocation(result.costAllocation)
							break
						case 'voyage_list':
							if (result.voyageList) setVoyageList(result.voyageList)
							break
						case 'vessel_manifests':
							if (result.vesselManifests) setVesselManifests(result.vesselManifests)
							break
					}
					
					setProcessingStats(prev => prev ? {
						...prev,
						completedFiles: i + 1,
						processedRecords: prev.processedRecords + recordsProcessed
					} : null)
					
				} catch (error) {
					clearInterval(progressInterval)
					
					setFiles(prev => prev.map(f => 
						f.id === fileItem.id ? { 
							...f, 
							status: 'error',
							progress: 0,
							error: error instanceof Error ? error.message : 'Processing failed'
						} : f
					))
				}
			}
			
			addNotification('processing-complete', { message: 'All files processed successfully!' })
			setIsDataReady(true)
			
		} catch (error) {
			addNotification('processing-complete', { message: 'Error processing files' })
		} finally {
			setIsProcessing(false)
			setProcessingStats(null)
		}
	}

	const removeFile = (fileId: string) => {
		setFiles(prev => prev.filter(f => f.id !== fileId))
	}

	const retryFile = (fileId: string) => {
		const file = files.find(f => f.id === fileId)
		if (file) {
			detectAndValidateFile(file)
		}
	}

	const clearAll = () => {
		setFiles([])
		setProcessingStats(null)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files)
		}
	}

	const selectedFile = files.find(f => f.id === selectedFileId)

	return (
		<div className="max-w-6xl mx-auto p-6">
			<div className="mb-8">
				<h2 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Data Upload</h2>
				<p className="text-gray-600">Upload multiple Excel files with real-time validation and progress tracking</p>
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
						>
							Update
						</Button>
						<Button
							size="sm"
							color={uploadMode === 'replace' ? 'danger' : 'default'}
							variant={uploadMode === 'replace' ? 'solid' : 'flat'}
							onClick={() => setUploadMode('replace')}
							startContent={<RefreshCw size={16} />}
						>
							Replace All
						</Button>
					</div>
				</div>
			</Card>

			{/* Drop Zone */}
			<div
				className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
					isDragging 
						? 'border-green-500 bg-green-50' 
						: 'border-gray-300 hover:border-gray-400 bg-gray-50'
				}`}
				onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept=".xlsx,.xls,.csv"
					onChange={(e) => e.target.files && handleFiles(e.target.files)}
					className="hidden"
				/>
				
				<Upload className={`mx-auto mb-4 ${isDragging ? 'text-green-500' : 'text-gray-400'}`} size={48} />
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					{isDragging ? 'Drop files here' : 'Drag & drop Excel files'}
				</h3>
				<p className="text-gray-600 mb-4">or</p>
				<Button
					color="primary"
					onClick={() => fileInputRef.current?.click()}
					disabled={isProcessing}
				>
					Browse Files
				</Button>
				<p className="text-sm text-gray-500 mt-4">
					Supports .xlsx, .xls, and .csv files up to 50MB
				</p>
			</div>

			{/* File List */}
			{files.length > 0 && (
				<div className="mt-8">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							Files ({files.length})
						</h3>
						<div className="flex gap-2">
							{!isProcessing && (
								<Button
									size="sm"
									color="danger"
									variant="flat"
									onClick={clearAll}
									startContent={<X size={16} />}
								>
									Clear All
								</Button>
							)}
							<Button
								size="sm"
								color="success"
								onClick={processFiles}
								disabled={isProcessing || files.every(f => f.status !== 'pending')}
								isLoading={isProcessing}
								startContent={!isProcessing && <Zap size={16} />}
							>
								Process Files
							</Button>
						</div>
					</div>

					{/* Processing Stats */}
					{processingStats && (
						<Card className="mb-4 p-4 bg-blue-50 border-blue-200">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<Loader2 className="animate-spin text-blue-600" size={20} />
									<span className="font-medium text-blue-900">Processing...</span>
								</div>
								<span className="text-sm text-blue-700">
									{processingStats.completedFiles} / {processingStats.totalFiles} files
								</span>
							</div>
							{processingStats.currentFile && (
								<p className="text-sm text-blue-700 mb-1">
									{processingStats.currentStage} - {processingStats.currentFile}
								</p>
							)}
							<Progress 
								value={(processingStats.processedRecords / processingStats.totalRecords) * 100}
								color="primary"
								size="sm"
							/>
						</Card>
					)}

					{/* File Items */}
					<div className="space-y-3">
						{files.map((file) => {
							const typeInfo = file.type ? fileTypeMapping[file.type] : null
							
							return (
								<motion.div
									key={file.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, x: -100 }}
									className="bg-white rounded-lg border p-4"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3 flex-1">
											<div className="text-2xl">
												{typeInfo ? typeInfo.icon : '📄'}
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2">
													<h4 className="font-medium text-gray-900">
														{file.file.name}
													</h4>
													{typeInfo && (
														<Chip size="sm" color={typeInfo.color as any} variant="flat">
															{typeInfo.name}
														</Chip>
													)}
												</div>
												<p className="text-sm text-gray-500">
													{(file.file.size / 1024 / 1024).toFixed(2)} MB
													{file.preview && ` • ${file.preview.rowCount} rows`}
												</p>
											</div>
										</div>
										
										<div className="flex items-center gap-2">
											{/* Status */}
											{file.status === 'validating' && (
												<Chip 
													startContent={<Loader2 className="animate-spin" size={14} />}
													color="primary"
													variant="flat"
												>
													Validating
												</Chip>
											)}
											{file.status === 'pending' && (
												<Chip 
													startContent={<FileCheck size={14} />}
													color="success"
													variant="flat"
												>
													Ready
												</Chip>
											)}
											{file.status === 'processing' && (
												<div className="w-32">
													<Progress value={file.progress} size="sm" color="primary" />
												</div>
											)}
											{file.status === 'complete' && (
												<Chip 
													startContent={<CheckCircle size={14} />}
													color="success"
												>
													Complete
												</Chip>
											)}
											{file.status === 'error' && (
												<Chip 
													startContent={<AlertCircle size={14} />}
													color="danger"
												>
													Error
												</Chip>
											)}
											
											{/* Actions */}
											{file.preview && (
												<Button
													size="sm"
													variant="flat"
													isIconOnly
													onClick={() => {
														setSelectedFileId(file.id)
														setShowPreview(true)
													}}
												>
													<Eye size={16} />
												</Button>
											)}
											{file.status === 'error' && (
												<Button
													size="sm"
													variant="flat"
													isIconOnly
													onClick={() => retryFile(file.id)}
												>
													<RefreshCw size={16} />
												</Button>
											)}
											{!isProcessing && (
												<Button
													size="sm"
													variant="flat"
													isIconOnly
													color="danger"
													onClick={() => removeFile(file.id)}
												>
													<X size={16} />
												</Button>
											)}
										</div>
									</div>
									
									{/* Error Message */}
									{file.error && (
										<div className="mt-2 p-2 bg-red-50 rounded-md">
											<p className="text-sm text-red-700 flex items-center gap-2">
												<AlertCircle size={16} />
												{file.error}
											</p>
										</div>
									)}
									
									{/* Result Summary */}
									{file.result && (
										<div className="mt-2 grid grid-cols-3 gap-4 text-sm">
											<div>
												<span className="text-gray-500">Processed:</span>
												<span className="ml-2 font-medium text-gray-900">
													{file.result.recordsProcessed}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Skipped:</span>
												<span className="ml-2 font-medium text-gray-900">
													{file.result.recordsSkipped}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Warnings:</span>
												<span className="ml-2 font-medium text-gray-900">
													{file.result.warnings.length}
												</span>
											</div>
										</div>
									)}
								</motion.div>
							)
						})}
					</div>
				</div>
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
								<h3>Data Preview</h3>
								{selectedFile && (
									<p className="text-sm text-gray-500 font-normal">
										{selectedFile.file.name} - {selectedFile.preview?.rowCount} rows
									</p>
								)}
							</ModalHeader>
							<ModalBody>
								{selectedFile?.preview && (
									<div className="overflow-x-auto">
										<table className="min-w-full">
											<thead>
												<tr className="border-b">
													{selectedFile.preview.headers.map((header, i) => (
														<th key={i} className="px-4 py-2 text-left text-sm font-medium text-gray-900">
															{header}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{selectedFile.preview.sampleData.map((row, i) => (
													<tr key={i} className="border-b">
														{selectedFile.preview?.headers.map((header, j) => (
															<td key={j} className="px-4 py-2 text-sm text-gray-700">
																{row[header] || '-'}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
										{selectedFile.preview.rowCount > 10 && (
											<p className="text-sm text-gray-500 mt-2 text-center">
												Showing first 10 rows of {selectedFile.preview.rowCount}
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

export default EnhancedFileUpload