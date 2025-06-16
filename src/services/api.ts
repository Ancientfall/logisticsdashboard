import axios, { AxiosInstance, AxiosError } from 'axios'
import { 
	LoginCredentials, 
	RegisterData, 
	User, 
	WellOperation, 
	Vessel, 
	FluidAnalysis,
	DashboardData,
	UploadResponse,
	PaginatedResponse
} from '../types'

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'

// Create axios instance
const api: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json'
	},
	timeout: 30000
})

// Token management
const TOKEN_KEY = 'bp_logistics_token'
const USER_KEY = 'bp_logistics_user'

export const tokenManager = {
	getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
	setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
	removeToken: (): void => localStorage.removeItem(TOKEN_KEY),
	getUser: (): User | null => {
		const userStr = localStorage.getItem(USER_KEY)
		return userStr ? JSON.parse(userStr) : null
	},
	setUser: (user: User): void => localStorage.setItem(USER_KEY, JSON.stringify(user)),
	removeUser: (): void => localStorage.removeItem(USER_KEY),
	clear: (): void => {
		localStorage.removeItem(TOKEN_KEY)
		localStorage.removeItem(USER_KEY)
	}
}

// Request interceptor to add auth token
api.interceptors.request.use(
	(config) => {
		const token = tokenManager.getToken()
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	},
	(error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		if (error.response?.status === 401) {
			// Token expired or invalid
			tokenManager.clear()
			window.location.href = '/login'
		}
		return Promise.reject(error)
	}
)

// Auth API
export const authAPI = {
	login: async (credentials: LoginCredentials) => {
		const response = await api.post('/auth/login', credentials)
		const { token, user } = response.data
		tokenManager.setToken(token)
		tokenManager.setUser(user)
		return response.data
	},

	register: async (data: RegisterData) => {
		const response = await api.post('/auth/register', data)
		const { token, user } = response.data
		tokenManager.setToken(token)
		tokenManager.setUser(user)
		return response.data
	},

	logout: async () => {
		try {
			await api.post('/auth/logout')
		} finally {
			tokenManager.clear()
		}
	},

	getCurrentUser: async () => {
		const response = await api.get('/auth/me')
		return response.data.user
	},

	updatePassword: async (currentPassword: string, newPassword: string) => {
		const response = await api.put('/auth/password', {
			currentPassword,
			newPassword
		})
		return response.data
	},

	refreshToken: async () => {
		const token = tokenManager.getToken()
		if (!token) throw new Error('No token available')
		
		const response = await api.post('/auth/refresh', { token })
		const { token: newToken, user } = response.data
		tokenManager.setToken(newToken)
		tokenManager.setUser(user)
		return response.data
	},

	requestPasswordReset: async (email: string) => {
		const response = await api.post('/auth/password-reset', { email })
		return response.data
	},

	resetPassword: async (token: string, newPassword: string) => {
		const response = await api.post('/auth/password-reset/confirm', {
			token,
			newPassword
		})
		return response.data
	},

	validateResetToken: async (token: string) => {
		const response = await api.get(`/auth/password-reset/${token}`)
		return response.data
	}
}

// Data API
export const dataAPI = {
	// Well Operations
	getWellOperations: async (params?: {
		page?: number
		limit?: number
		startDate?: string
		endDate?: string
		location?: string
		well?: string
	}): Promise<PaginatedResponse<WellOperation>> => {
		const response = await api.get('/data/wells', { params })
		return response.data
	},

	getWellOperationById: async (id: string): Promise<WellOperation> => {
		const response = await api.get(`/data/wells/${id}`)
		return response.data.data
	},

	deleteWellOperation: async (id: string) => {
		const response = await api.delete(`/data/wells/${id}`)
		return response.data
	},

	// Vessels
	getVessels: async (params?: {
		page?: number
		limit?: number
		startDate?: string
		endDate?: string
		location?: string
		vessel?: string
	}): Promise<PaginatedResponse<Vessel>> => {
		const response = await api.get('/data/vessels', { params })
		return response.data
	},

	getVesselById: async (id: string): Promise<Vessel> => {
		const response = await api.get(`/data/vessels/${id}`)
		return response.data.data
	},

	deleteVessel: async (id: string) => {
		const response = await api.delete(`/data/vessels/${id}`)
		return response.data
	},

	// Fluid Analyses
	getFluidAnalyses: async (params?: {
		page?: number
		limit?: number
		startDate?: string
		endDate?: string
		well?: string
		sample?: string
	}): Promise<PaginatedResponse<FluidAnalysis>> => {
		const response = await api.get('/data/fluid-analyses', { params })
		return response.data
	},

	getFluidAnalysisById: async (id: string): Promise<FluidAnalysis> => {
		const response = await api.get(`/data/fluid-analyses/${id}`)
		return response.data.data
	},

	deleteFluidAnalysis: async (id: string) => {
		const response = await api.delete(`/data/fluid-analyses/${id}`)
		return response.data
	},

	// Dashboard & Analytics
	getDashboardData: async (filters?: {
		startDate?: string
		endDate?: string
		location?: string
	}): Promise<DashboardData> => {
		const response = await api.get('/data/dashboard', { params: filters })
		return response.data.data
	},

	getAnalytics: async (params: {
		type: 'wells' | 'vessels' | 'fluid'
		groupBy?: string
		metrics?: string[]
		startDate?: string
		endDate?: string
	}) => {
		const response = await api.get('/data/analytics', { params })
		return response.data.data
	},

	// Bulk operations
	deleteByUploadId: async (uploadId: string) => {
		const response = await api.delete(`/data/upload/${uploadId}`)
		return response.data
	}
}

// Upload API
export const uploadAPI = {
	uploadWellOperations: async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/upload/wells', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: (progressEvent) => {
				if (onProgress && progressEvent.total) {
					const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
					onProgress(progress)
				}
			}
		})
		return response.data
	},

	uploadVessels: async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/upload/vessels', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: (progressEvent) => {
				if (onProgress && progressEvent.total) {
					const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
					onProgress(progress)
				}
			}
		})
		return response.data
	},

	uploadFluidAnalyses: async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
		const formData = new FormData()
		formData.append('file', file)

		const response = await api.post('/upload/fluid-analyses', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: (progressEvent) => {
				if (onProgress && progressEvent.total) {
					const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
					onProgress(progress)
				}
			}
		})
		return response.data
	},

	getUploadHistory: async (params?: {
		page?: number
		limit?: number
	}) => {
		const response = await api.get('/upload/history', { params })
		return response.data
	},

	getUploadDetails: async (uploadId: string) => {
		const response = await api.get(`/upload/history/${uploadId}`)
		return response.data.data
	}
}

// Admin API
export const adminAPI = {
	getUsers: async (params?: {
		page?: number
		limit?: number
		search?: string
		role?: string
		isActive?: string
	}) => {
		const response = await api.get('/admin/users', { params })
		return response.data
	},

	getUser: async (id: string) => {
		const response = await api.get(`/admin/users/${id}`)
		return response.data.data
	},

	updateUser: async (id: string, data: { role?: string, isActive?: boolean }) => {
		const response = await api.put(`/admin/users/${id}`, data)
		return response.data
	},

	deleteUser: async (id: string) => {
		const response = await api.delete(`/admin/users/${id}`)
		return response.data
	},

	getSystemStats: async () => {
		const response = await api.get('/admin/stats')
		return response.data.data
	},

	getActivityLogs: async (params?: { page?: number, limit?: number }) => {
		const response = await api.get('/admin/activity', { params })
		return response.data
	}
}

// Error handling helper
export const handleAPIError = (error: any): string => {
	if (axios.isAxiosError(error)) {
		if (error.response?.data?.error) {
			return error.response.data.error
		}
		if (error.response?.data?.details) {
			return Array.isArray(error.response.data.details) 
				? error.response.data.details.join(', ')
				: error.response.data.details
		}
		if (error.message) {
			return error.message
		}
	}
	return 'An unexpected error occurred'
}

export default api