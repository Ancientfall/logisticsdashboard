import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody, CardHeader, Button, Progress, Chip } from '@nextui-org/react'
import { Upload, FileCheck, AlertCircle, Database, ChevronRight, Folder, File } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useData } from '../../context/DataContext'
import { useNotifications } from '../../context/NotificationContext'
import { processExcelFiles } from '../../utils/fileProcessingWrapper'
import { uploadAPI } from '../../services/api'
import { motion } from 'framer-motion'

export default function FileUploadPageWithDB() {
	const navigate = useNavigate()
	const { 
		setVoyageEvents,
		setVesselManifests,
		setMasterFacilities,
		setCostAllocation,
		setVesselClassifications,
		setVoyageList,
		setBulkActions,
		setIsDataReady
	} = useData()
	const { addNotification } = useNotifications()
	const [uploadProgress, setUploadProgress] = useState(0)
	const [isProcessing, setIsProcessing] = useState(false)
	const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'uploading' | 'success' | 'error'>('idle')
	const [statusMessage, setStatusMessage] = useState('')
	const [processedFiles, setProcessedFiles] = useState<string[]>([])

	// Helper function to save processed data to context
	const saveProcessedDataToContext = (data: any, setters: any) => {
		if (data.voyageEvents) setters.setVoyageEvents(data.voyageEvents)
		if (data.vesselManifests) setters.setVesselManifests(data.vesselManifests)
		if (data.masterFacilities) setters.setMasterFacilities(data.masterFacilities)
		if (data.costAllocation) setters.setCostAllocation(data.costAllocation)
		if (data.vesselClassifications) setters.setVesselClassifications(data.vesselClassifications)
		if (data.voyageList) setters.setVoyageList(data.voyageList)
		if (data.bulkActions) setters.setBulkActions(data.bulkActions)
		setters.setIsDataReady(true)
	}

	const uploadToDatabase = async (files: File[], processedData: any) => {
		try {
			setUploadStatus('uploading')
			setStatusMessage('Uploading to database...')
			
			let uploadedCount = 0
			const totalFiles = files.length
			
			// Upload each file type to its respective endpoint
			for (const file of files) {
				const fileName = file.name.toLowerCase()
				setStatusMessage(`Uploading ${file.name}...`)
				
				try {
					if (fileName.includes('well') || fileName.includes('operations')) {
						await uploadAPI.uploadWellOperations(file)
						uploadedCount++
					} else if (fileName.includes('vessel') || fileName.includes('voyage')) {
						await uploadAPI.uploadVessels(file)
						uploadedCount++
					} else if (fileName.includes('fluid') || fileName.includes('analysis')) {
						await uploadAPI.uploadFluidAnalyses(file)
						uploadedCount++
					} else {
						console.warn(`Unknown file type: ${file.name}`)
					}
					
					setUploadProgress((uploadedCount / totalFiles) * 100)
				} catch (error) {
					console.error(`Failed to upload ${file.name}:`, error)
					addNotification('system-update', {
						title: 'Upload Warning',
						message: `Failed to upload ${file.name} to database. Data saved locally.`
					})
				}
			}
			
			return uploadedCount > 0
		} catch (error) {
			console.error('Database upload error:', error)
			return false
		}
	}

	const handleFileDrop = async (acceptedFiles: File[]) => {
		if (acceptedFiles.length === 0) return

		setIsProcessing(true)
		setUploadStatus('processing')
		setUploadProgress(0)
		setStatusMessage('Processing files...')
		setProcessedFiles([])

		try {
			// Process files locally first
			const result = await processExcelFiles(acceptedFiles, (progress) => {
				setUploadProgress(progress * 0.5) // First 50% for processing
			})

			if (result.success && result.data) {
				// Save to local storage using the DataContext setters
				saveProcessedDataToContext(result.data, {
					setVoyageEvents,
					setVesselManifests,
					setMasterFacilities,
					setCostAllocation,
					setVesselClassifications,
					setVoyageList,
					setBulkActions,
					setIsDataReady
				})
				setProcessedFiles(acceptedFiles.map(f => f.name))
				
				// Upload to PostgreSQL database
				const dbSuccess = await uploadToDatabase(acceptedFiles, result.data)
				
				if (dbSuccess) {
					setUploadStatus('success')
					setStatusMessage('Files uploaded successfully to database!')
					addNotification('upload-success', {
						fileName: 'Multiple files',
						recordCount: acceptedFiles.length
					})
				} else {
					setUploadStatus('success')
					setStatusMessage('Files processed and saved locally. Database upload failed.')
					addNotification('processing-complete', {
						fileName: 'Multiple files',
						recordCount: acceptedFiles.length
					})
				}
				
				setUploadProgress(100)
				
				// Navigate to dashboard after delay
				setTimeout(() => {
					navigate('/dashboard')
				}, 2000)
			} else {
				throw new Error(result.error || 'Failed to process files')
			}
		} catch (error) {
			console.error('File processing error:', error)
			setUploadStatus('error')
			setStatusMessage(error instanceof Error ? error.message : 'Failed to process files')
			
			addNotification('system-update', {
				title: 'Upload Failed',
				message: error instanceof Error ? error.message : 'Failed to process files'
			})
		} finally {
			setIsProcessing(false)
		}
	}

	const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
		onDrop: handleFileDrop,
		accept: {
			'application/vnd.ms-excel': ['.xls'],
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
			'text/csv': ['.csv']
		},
		multiple: true,
		disabled: isProcessing
	})

	const getStatusIcon = () => {
		switch (uploadStatus) {
			case 'processing':
			case 'uploading':
				return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bp-green" />
			case 'success':
				return <FileCheck className="w-12 h-12 text-green-500" />
			case 'error':
				return <AlertCircle className="w-12 h-12 text-red-500" />
			default:
				return <Upload className="w-12 h-12 text-gray-400" />
		}
	}

	return (
		<div className="max-w-4xl mx-auto p-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Card className="shadow-xl">
					<CardHeader className="pb-4">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-bp-green/10 rounded-lg">
								<Database className="w-6 h-6 text-bp-green" />
							</div>
							<div>
								<h2 className="text-2xl font-bold">Upload Data Files</h2>
								<p className="text-gray-600">Upload Excel files to populate your dashboards and database</p>
							</div>
						</div>
					</CardHeader>

					<CardBody className="pt-2">
						<div
							{...getRootProps()}
							className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
								isDragActive 
									? 'border-bp-green bg-bp-green/5' 
									: isProcessing
									? 'border-gray-300 bg-gray-50 cursor-not-allowed'
									: 'border-gray-300 hover:border-bp-green hover:bg-gray-50'
							}`}
						>
							<input {...getInputProps()} />
							
							<div className="flex flex-col items-center gap-4">
								{getStatusIcon()}
								
								<div>
									<p className="text-lg font-medium text-gray-700">
										{isDragActive
											? 'Drop files here...'
											: isProcessing
											? statusMessage
											: 'Drag & drop Excel files here'}
									</p>
									<p className="text-sm text-gray-500 mt-1">
										{!isProcessing && 'or click to browse'}
									</p>
								</div>

								{!isProcessing && (
									<div className="flex flex-wrap gap-2 justify-center">
										<Chip size="sm" variant="flat">
											<File className="w-3 h-3 mr-1" />
											.xlsx
										</Chip>
										<Chip size="sm" variant="flat">
											<File className="w-3 h-3 mr-1" />
											.xls
										</Chip>
										<Chip size="sm" variant="flat">
											<File className="w-3 h-3 mr-1" />
											.csv
										</Chip>
									</div>
								)}
							</div>
						</div>

						{isProcessing && (
							<div className="mt-6">
								<div className="flex justify-between text-sm mb-2">
									<span className="text-gray-600">
										{uploadStatus === 'processing' ? 'Processing files...' : 'Uploading to database...'}
									</span>
									<span className="font-medium">{Math.round(uploadProgress)}%</span>
								</div>
								<Progress 
									value={uploadProgress} 
									className="h-2"
									color="success"
								/>
							</div>
						)}

						{processedFiles.length > 0 && (
							<div className="mt-6">
								<h3 className="text-sm font-medium text-gray-700 mb-3">Processed Files:</h3>
								<div className="space-y-2">
									{processedFiles.map((fileName, index) => (
										<div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
											<FileCheck className="w-4 h-4 text-green-500" />
											<span className="text-sm text-gray-700">{fileName}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{uploadStatus === 'success' && (
							<div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
								<div className="flex items-start gap-3">
									<FileCheck className="w-5 h-5 text-green-600 mt-0.5" />
									<div>
										<p className="font-medium text-green-900">Upload Complete!</p>
										<p className="text-sm text-green-700 mt-1">
											Data has been saved to the database and is available across all dashboards.
										</p>
									</div>
								</div>
							</div>
						)}

						<div className="mt-8 space-y-4">
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<h3 className="font-medium text-blue-900 mb-2">Expected File Types:</h3>
								<ul className="space-y-2 text-sm text-blue-800">
									<li className="flex items-center gap-2">
										<Folder className="w-4 h-4" />
										Well Operations data (drilling, production metrics)
									</li>
									<li className="flex items-center gap-2">
										<Folder className="w-4 h-4" />
										Vessel/Voyage data (vessel movements, manifests)
									</li>
									<li className="flex items-center gap-2">
										<Folder className="w-4 h-4" />
										Fluid Analysis data (chemical analysis, quality metrics)
									</li>
								</ul>
							</div>

							{!isProcessing && acceptedFiles.length === 0 && (
								<Button
									color="primary"
									variant="flat"
									endContent={<ChevronRight className="w-4 h-4" />}
									onClick={() => navigate('/dashboard')}
									className="w-full"
								>
									Skip Upload & View Dashboard
								</Button>
							)}
						</div>
					</CardBody>
				</Card>
			</motion.div>
		</div>
	)
}