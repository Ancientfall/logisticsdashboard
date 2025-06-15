import * as XLSX from 'xlsx'

export interface ExcelPreview {
	headers: string[]
	data: any[]
	rowCount: number
}

export class ExcelValidator {
	static async getPreview(file: File, sampleSize: number = 10): Promise<ExcelPreview> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			
			reader.onload = (e) => {
				try {
					const data = new Uint8Array(e.target?.result as ArrayBuffer)
					const workbook = XLSX.read(data, { type: 'array' })
					
					// Get the first sheet
					const firstSheetName = workbook.SheetNames[0]
					const worksheet = workbook.Sheets[firstSheetName]
					
					// Convert to JSON
					const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
					
					if (jsonData.length === 0) {
						throw new Error('File appears to be empty')
					}
					
					// Extract headers
					const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h)
					
					// Get sample data
					const sampleData = []
					for (let i = 1; i <= Math.min(sampleSize, jsonData.length - 1); i++) {
						const row = jsonData[i]
						const rowData: any = {}
						headers.forEach((header, index) => {
							rowData[header] = row[index] || null
						})
						sampleData.push(rowData)
					}
					
					resolve({
						headers,
						data: sampleData,
						rowCount: jsonData.length - 1 // Exclude header row
					})
				} catch (error) {
					reject(error)
				}
			}
			
			reader.onerror = () => {
				reject(new Error('Failed to read file'))
			}
			
			reader.readAsArrayBuffer(file)
		})
	}
	
	static validateFileSize(file: File, maxSizeMB: number = 50): boolean {
		const maxSize = maxSizeMB * 1024 * 1024
		return file.size <= maxSize
	}
	
	static validateFileType(file: File): boolean {
		const validTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
			'text/csv'
		]
		const validExtensions = ['.xlsx', '.xls', '.csv']
		
		const hasValidType = validTypes.includes(file.type) || file.type === ''
		const hasValidExtension = validExtensions.some(ext => 
			file.name.toLowerCase().endsWith(ext)
		)
		
		return hasValidType && hasValidExtension
	}
	
	static async validateHeaders(file: File, requiredHeaders: string[]): Promise<boolean> {
		try {
			const preview = await this.getPreview(file, 1)
			const fileHeaders = preview.headers.map(h => h.toLowerCase())
			const required = requiredHeaders.map(h => h.toLowerCase())
			
			return required.every(header => 
				fileHeaders.some(fileHeader => fileHeader.includes(header))
			)
		} catch {
			return false
		}
	}
}