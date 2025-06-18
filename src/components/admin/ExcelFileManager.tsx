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
	Card,
	CardBody,
	CardHeader,
	Progress,
	Input
} from '@nextui-org/react'
import { 
	Upload, 
	Download, 
	Trash2, 
	FileText, 
	Server, 
	Cloud, 
	RefreshCw,
	AlertCircle,
	CheckCircle,
	FileCheck
} from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'

interface ServerFile {
	name: string
	size: number
	lastModified: string
	type: 'data' | 'reference'
	path: string
}

interface ServerFilesResponse {
	success: boolean
	files: ServerFile[]
	metadata: {
		lastUpdated: string
		totalFiles: number
		version: string
	}
}

const ExcelFileManager: React.FC = () => {
	const { addNotification } = useNotifications()
	const [files, setFiles] = useState<ServerFile[]>([])
	const [metadata, setMetadata] = useState<ServerFilesResponse['metadata'] | null>(null)
	const [loading, setLoading] = useState(true)
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [showUploadModal, setShowUploadModal] = useState(false)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [selectedFile, setSelectedFile] = useState<ServerFile | null>(null)
	const [uploadFile, setUploadFile] = useState<File | null>(null)
	const [isReference, setIsReference] = useState(false)

	// Fetch server files
	const fetchServerFiles = useCallback(async () => {
		try {
			setLoading(true)
			const response = await fetch('/api/excel-files')
			
			if (response.ok) {
				const data: ServerFilesResponse = await response.json()
				setFiles(data.files || [])
				setMetadata(data.metadata || null)
			} else {
				addNotification('system-update', {
					title: 'Error',
					message: 'Failed to fetch server files'
				})
			}
		} catch (error) {
			console.error('Error fetching server files:', error)
			addNotification('system-update', {
				title: 'Error',
				message: 'Failed to connect to server'
			})
		} finally {
			setLoading(false)
		}
	}, [addNotification])

	// Initial load
	useEffect(() => {
		fetchServerFiles()
	}, [fetchServerFiles])

	// Upload file to server
	const handleUpload = async () => {
		if (!uploadFile) return

		try {
			setUploading(true)
			setUploadProgress(0)

			const formData = new FormData()
			formData.append('file', uploadFile)
			formData.append('isReference', isReference.toString())

			// Simulate progress for better UX
			const progressInterval = setInterval(() => {
				setUploadProgress(prev => Math.min(prev + 10, 90))
			}, 200)

			const response = await fetch('/api/excel-files/upload', {
				method: 'POST',
				body: formData,
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				}
			})

			clearInterval(progressInterval)
			setUploadProgress(100)

			if (response.ok) {
				await response.json()
				
				addNotification('upload-success', {
					title: 'Upload Successful',
					message: `${uploadFile.name} has been uploaded to the server`
				})

				// Refresh file list
				await fetchServerFiles()
				
				// Reset upload state
				setShowUploadModal(false)
				setUploadFile(null)
				setIsReference(false)
			} else {
				const error = await response.json()
				addNotification('system-update', {
					title: 'Upload Failed',
					message: error.message || 'Failed to upload file'
				})
			}
		} catch (error) {
			console.error('Upload error:', error)
			addNotification('system-update', {
				title: 'Upload Error',
				message: 'Network error occurred during upload'
			})
		} finally {
			setUploading(false)
			setUploadProgress(0)
		}
	}

	// Delete file from server
	const handleDelete = async () => {
		if (!selectedFile) return

		try {
			const response = await fetch(`/api/excel-files/${encodeURIComponent(selectedFile.name)}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token')}`
				}
			})

			if (response.ok) {
				addNotification('system-update', {
					title: 'File Deleted',
					message: `${selectedFile.name} has been removed from the server`
				})

				// Refresh file list
				await fetchServerFiles()
			} else {
				const error = await response.json()
				addNotification('system-update', {
					title: 'Delete Failed',
					message: error.message || 'Failed to delete file'
				})
			}
		} catch (error) {
			console.error('Delete error:', error)
			addNotification('system-update', {
				title: 'Delete Error',
				message: 'Network error occurred during deletion'
			})
		} finally {
			setShowDeleteModal(false)
			setSelectedFile(null)
		}
	}

	// Download file from server
	const handleDownload = async (file: ServerFile) => {
		try {
			const response = await fetch(`/api/excel-files/${encodeURIComponent(file.name)}`)
			
			if (response.ok) {
				const blob = await response.blob()
				const url = window.URL.createObjectURL(blob)
				const a = document.createElement('a')
				a.href = url
				a.download = file.name
				document.body.appendChild(a)
				a.click()
				window.URL.revokeObjectURL(url)
				document.body.removeChild(a)

				addNotification('export-complete', {
					title: 'Download Started',
					message: `Downloading ${file.name}`
				})
			} else {
				addNotification('system-update', {
					title: 'Download Failed',
					message: 'Failed to download file from server'
				})
			}
		} catch (error) {
			console.error('Download error:', error)
			addNotification('system-update', {
				title: 'Download Error',
				message: 'Network error occurred during download'
			})
		}
	}

	// Format file size
	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString()
	}

	// Get file type color
	const getFileTypeColor = (type: string) => {
		return type === 'reference' ? 'secondary' : 'primary'
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-100 rounded-lg">
							<Server className="w-6 h-6 text-blue-600" />
						</div>
						<div>
							<h2 className="text-xl font-bold">Excel File Management</h2>
							<p className="text-gray-600">Manage Excel files stored on the server</p>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							color="primary"
							startContent={<Upload className="w-4 h-4" />}
							onClick={() => setShowUploadModal(true)}
						>
							Upload File
						</Button>
						<Button
							variant="bordered"
							startContent={<RefreshCw className="w-4 h-4" />}
							onClick={fetchServerFiles}
							isLoading={loading}
						>
							Refresh
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Statistics */}
			{metadata && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card>
						<CardBody className="text-center">
							<FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
							<p className="text-2xl font-bold">{files.length}</p>
							<p className="text-gray-600">Total Files</p>
						</CardBody>
					</Card>
					<Card>
						<CardBody className="text-center">
							<Cloud className="w-8 h-8 text-green-500 mx-auto mb-2" />
							<p className="text-2xl font-bold">{files.filter(f => f.type === 'data').length}</p>
							<p className="text-gray-600">Data Files</p>
						</CardBody>
					</Card>
					<Card>
						<CardBody className="text-center">
							<CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-2" />
							<p className="text-2xl font-bold">{files.filter(f => f.type === 'reference').length}</p>
							<p className="text-gray-600">Reference Files</p>
						</CardBody>
					</Card>
				</div>
			)}

			{/* Last Updated Info */}
			{metadata && (
				<Card>
					<CardBody>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<FileCheck className="w-5 h-5 text-green-500" />
								<span className="text-sm text-gray-600">
									Last updated: {formatDate(metadata.lastUpdated)}
								</span>
							</div>
							<Chip size="sm" variant="flat" color="primary">
								Version {metadata.version}
							</Chip>
						</div>
					</CardBody>
				</Card>
			)}

			{/* Files Table */}
			<Card>
				<CardBody>
					{loading ? (
						<div className="flex justify-center py-8">
							<div className="flex items-center gap-2">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
								<span>Loading files...</span>
							</div>
						</div>
					) : files.length === 0 ? (
						<div className="text-center py-8">
							<FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600 mb-2">No files found on server</p>
							<p className="text-sm text-gray-500">Upload some Excel files to get started</p>
						</div>
					) : (
						<Table aria-label="Excel files table">
							<TableHeader>
								<TableColumn>NAME</TableColumn>
								<TableColumn>TYPE</TableColumn>
								<TableColumn>SIZE</TableColumn>
								<TableColumn>LAST MODIFIED</TableColumn>
								<TableColumn>ACTIONS</TableColumn>
							</TableHeader>
							<TableBody>
								{files.map((file, index) => (
									<TableRow key={index}>
										<TableCell>
											<div className="flex items-center gap-2">
												<FileText className="w-4 h-4 text-blue-500" />
												<span className="font-medium">{file.name}</span>
											</div>
										</TableCell>
										<TableCell>
											<Chip 
												size="sm" 
												variant="flat" 
												color={getFileTypeColor(file.type)}
											>
												{file.type}
											</Chip>
										</TableCell>
										<TableCell>{formatFileSize(file.size)}</TableCell>
										<TableCell>{formatDate(file.lastModified)}</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													size="sm"
													variant="bordered"
													startContent={<Download className="w-3 h-3" />}
													onClick={() => handleDownload(file)}
												>
													Download
												</Button>
												<Button
													size="sm"
													color="danger"
													variant="bordered"
													startContent={<Trash2 className="w-3 h-3" />}
													onClick={() => {
														setSelectedFile(file)
														setShowDeleteModal(true)
													}}
												>
													Delete
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardBody>
			</Card>

			{/* Upload Modal */}
			<Modal 
				isOpen={showUploadModal} 
				onClose={() => setShowUploadModal(false)}
				size="2xl"
			>
				<ModalContent>
					{(onClose) => (
						<>
							<ModalHeader className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<Upload className="w-5 h-5" />
									Upload Excel File
								</div>
							</ModalHeader>
							<ModalBody>
								<div className="space-y-4">
									<div>
										<Input
											type="file"
											label="Select Excel File"
											accept=".xlsx,.xls,.csv"
											onChange={(e) => {
												const file = e.target.files?.[0]
												setUploadFile(file || null)
											}}
										/>
									</div>
									
									<div className="flex items-center gap-2">
										<input
											type="checkbox"
											id="isReference"
											checked={isReference}
											onChange={(e) => setIsReference(e.target.checked)}
											className="rounded"
										/>
										<label htmlFor="isReference" className="text-sm">
											This is a reference data file
										</label>
									</div>
									
									{uploadFile && (
										<div className="p-3 bg-blue-50 rounded-lg">
											<p className="text-sm font-medium">{uploadFile.name}</p>
											<p className="text-xs text-gray-600">
												{formatFileSize(uploadFile.size)} • {isReference ? 'Reference Data' : 'Data File'}
											</p>
										</div>
									)}
									
									{uploading && (
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span>Uploading...</span>
												<span>{uploadProgress}%</span>
											</div>
											<Progress value={uploadProgress} className="w-full" />
										</div>
									)}
								</div>
							</ModalBody>
							<ModalFooter>
								<Button variant="bordered" onPress={onClose} disabled={uploading}>
									Cancel
								</Button>
								<Button 
									color="primary" 
									onPress={handleUpload}
									disabled={!uploadFile || uploading}
									isLoading={uploading}
								>
									{uploading ? 'Uploading...' : 'Upload File'}
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal 
				isOpen={showDeleteModal} 
				onClose={() => setShowDeleteModal(false)}
			>
				<ModalContent>
					{(onClose) => (
						<>
							<ModalHeader className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<AlertCircle className="w-5 h-5 text-red-500" />
									Confirm Deletion
								</div>
							</ModalHeader>
							<ModalBody>
								<p>
									Are you sure you want to delete <strong>{selectedFile?.name}</strong>?
								</p>
								<p className="text-sm text-gray-600">
									This action cannot be undone. Users will no longer be able to load this file from the server.
								</p>
							</ModalBody>
							<ModalFooter>
								<Button variant="bordered" onPress={onClose}>
									Cancel
								</Button>
								<Button color="danger" onPress={handleDelete}>
									Delete File
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>
		</div>
	)
}

export default ExcelFileManager