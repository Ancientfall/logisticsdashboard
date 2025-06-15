// Security utilities for BP Logistics Dashboard

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
	return input
		.replace(/[<>]/g, '') // Remove angle brackets
		.replace(/javascript:/gi, '') // Remove javascript: protocol
		.replace(/on\w+\s*=/gi, '') // Remove event handlers
		.trim()
}

/**
 * Validate file uploads
 */
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
	// Check file size (max 50MB)
	const maxSize = 50 * 1024 * 1024
	if (file.size > maxSize) {
		return { valid: false, error: 'File size exceeds 50MB limit' }
	}

	// Check file type
	const allowedTypes = [
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'text/csv'
	]
	
	if (!allowedTypes.includes(file.type)) {
		return { valid: false, error: 'Only Excel and CSV files are allowed' }
	}

	// Check file extension
	const allowedExtensions = ['.xlsx', '.xls', '.csv']
	const fileName = file.name.toLowerCase()
	const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
	
	if (!hasValidExtension) {
		return { valid: false, error: 'Invalid file extension' }
	}

	return { valid: true }
}

/**
 * Generate secure session ID
 */
export const generateSessionId = (): string => {
	const array = new Uint8Array(32)
	crypto.getRandomValues(array)
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if running in secure context
 */
export const isSecureContext = (): boolean => {
	return window.isSecureContext || window.location.protocol === 'https:'
}

/**
 * Sanitize data before storage
 */
export const sanitizeDataForStorage = (data: any): any => {
	if (typeof data === 'string') {
		return sanitizeInput(data)
	}
	
	if (Array.isArray(data)) {
		return data.map(item => sanitizeDataForStorage(item))
	}
	
	if (typeof data === 'object' && data !== null) {
		const sanitized: any = {}
		for (const key in data) {
			if (data.hasOwnProperty(key)) {
				sanitized[key] = sanitizeDataForStorage(data[key])
			}
		}
		return sanitized
	}
	
	return data
}

/**
 * Create a password hash (for generating new passwords)
 * Note: This is only for development/setup. In production, use server-side hashing
 */
export const createPasswordHash = async (password: string): Promise<string> => {
	// This is just for reference - actual hashing should be done server-side
	// For client-side, we use bcryptjs which is already imported in AuthContext
	console.log('To hash a password, use: bcrypt.hashSync(password, 10)')
	console.log('Example: bcrypt.hashSync("YourNewPassword", 10)')
	return 'Use bcrypt.hashSync() to generate hash'
}