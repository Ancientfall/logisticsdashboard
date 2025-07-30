/**
 * Secure wrapper for xlsx library to mitigate security vulnerabilities
 * Provides sanitization and validation for Excel file processing
 */

import * as XLSX from 'xlsx';
import { logWarn, logError } from './logger';

// Allowed mime types for Excel files
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum number of sheets to process
const MAX_SHEETS = 50;

// Maximum rows per sheet
const MAX_ROWS_PER_SHEET = 100000;

interface SecureXlsxOptions {
  maxFileSize?: number;
  maxSheets?: number;
  maxRowsPerSheet?: number;
  allowedMimeTypes?: string[];
  sanitizeValues?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate file before processing
 */
export function validateExcelFile(file: File, options: SecureXlsxOptions = {}): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const {
    maxFileSize = MAX_FILE_SIZE,
    allowedMimeTypes = ALLOWED_MIME_TYPES
  } = options;

  // Check file size
  if (file.size > maxFileSize) {
    result.isValid = false;
    result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size ${(maxFileSize / 1024 / 1024).toFixed(2)}MB`);
  }

  // Check mime type
  if (!allowedMimeTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push(`File type '${file.type}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Check file extension as backup
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['xlsx', 'xls', 'csv'];
  if (fileExtension && !allowedExtensions.includes(fileExtension)) {
    result.warnings.push(`File extension '${fileExtension}' may not be supported`);
  }

  return result;
}

/**
 * Sanitize cell value to prevent prototype pollution
 */
function sanitizeCellValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Convert to string first to prevent object manipulation
  const stringValue = String(value);

  // Remove potentially dangerous characters/patterns
  const sanitized = stringValue
    .replace(/__proto__/gi, '_proto_')
    .replace(/constructor/gi, 'ctor')
    .replace(/prototype/gi, 'proto')
    .replace(/function\s*\(/gi, 'func(')
    .replace(/<script/gi, '&lt;script')
    .replace(/javascript:/gi, 'js:');

  // Return original type if it was a number/boolean
  if (typeof value === 'number' && !isNaN(value)) {
    const numValue = parseFloat(sanitized);
    return isNaN(numValue) ? sanitized : numValue;
  }

  if (typeof value === 'boolean') {
    return sanitized.toLowerCase() === 'true';
  }

  return sanitized;
}

/**
 * Safely read Excel file with security validations
 */
export async function secureReadExcelFile(
  file: File, 
  options: SecureXlsxOptions = {}
): Promise<XLSX.WorkBook> {
  const {
    maxSheets = MAX_SHEETS,
    maxRowsPerSheet = MAX_ROWS_PER_SHEET,
    sanitizeValues = true
  } = options;

  // Validate file first
  const validation = validateExcelFile(file, options);
  if (!validation.isValid) {
    const errorMessage = `Excel file validation failed: ${validation.errors.join(', ')}`;
    logError(errorMessage, { component: 'secure-xlsx' });
    throw new Error(errorMessage);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    logWarn('Excel file validation warnings', {
      component: 'secure-xlsx',
      data: { warnings: validation.warnings }
    });
  }

  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Use xlsx to read the file with security options
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellHTML: false, // Prevent HTML interpretation
      sheetStubs: false, // Don't include empty cells
      bookFiles: false, // Don't read file list
      bookProps: false, // Don't read document properties
      bookSheets: false, // Don't read sheet info
      bookVBA: false, // Don't read VBA
    });

    // Validate sheet count
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length > maxSheets) {
      throw new Error(`File contains ${sheetNames.length} sheets, maximum allowed is ${maxSheets}`);
    }

    // Process and sanitize each sheet
    const sanitizedWorkbook: XLSX.WorkBook = {
      SheetNames: [],
      Sheets: {},
      Props: undefined,
      Workbook: undefined
    };

    sanitizedWorkbook.SheetNames = sheetNames.slice(0, maxSheets);

    for (const sheetName of sanitizedWorkbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) continue;

      // Convert to JSON to process data
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null,
        blankrows: false,
        raw: false // Get formatted values, not raw
      });

      // Validate row count
      if (jsonData.length > maxRowsPerSheet) {
        logWarn(`Sheet '${sheetName}' has ${jsonData.length} rows, truncating to ${maxRowsPerSheet}`, {
          component: 'secure-xlsx'
        });
        jsonData.splice(maxRowsPerSheet);
      }

      // Sanitize data if enabled
      const sanitizedData = sanitizeValues 
        ? jsonData.map(row => 
            Array.isArray(row) 
              ? row.map(cell => sanitizeCellValue(cell))
              : row
          )
        : jsonData;

      // Convert back to worksheet
      const sanitizedWorksheet = XLSX.utils.aoa_to_sheet(sanitizedData as any[][]);
      sanitizedWorkbook.Sheets[sheetName] = sanitizedWorksheet;
    }

    logWarn('Excel file processed securely', {
      component: 'secure-xlsx',
      data: {
        fileName: file.name,
        fileSize: file.size,
        sheetsProcessed: sanitizedWorkbook.SheetNames.length,
        sanitizationEnabled: sanitizeValues
      }
    });

    return sanitizedWorkbook;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error processing Excel file';
    logError('Secure Excel processing failed', {
      component: 'secure-xlsx',
      data: { fileName: file.name, error: errorMessage }
    });
    throw new Error(`Failed to process Excel file securely: ${errorMessage}`);
  }
}

/**
 * Secure version of XLSX.utils.sheet_to_json with additional protections
 */
export function secureSheetToJson<T = any>(
  worksheet: XLSX.WorkSheet,
  options: XLSX.Sheet2JSONOpts = {}
): T[] {
  try {
    // Add security-focused options
    const secureOptions: XLSX.Sheet2JSONOpts = {
      ...options,
      raw: false, // Always use formatted values
      defval: null, // Default value for empty cells
      blankrows: false, // Skip empty rows
    };

    const jsonData = XLSX.utils.sheet_to_json(worksheet, secureOptions);

    // Sanitize each object in the result
    return jsonData.map(row => {
      if (typeof row === 'object' && row !== null) {
        const sanitizedRow: any = {};
        
        for (const [key, value] of Object.entries(row)) {
          // Sanitize both key and value
          const sanitizedKey = sanitizeCellValue(key);
          const sanitizedValue = sanitizeCellValue(value);
          
          // Prevent prototype pollution through key names
          if (typeof sanitizedKey === 'string' && 
              !['__proto__', 'constructor', 'prototype'].includes(sanitizedKey.toLowerCase())) {
            sanitizedRow[sanitizedKey] = sanitizedValue;
          }
        }
        
        return sanitizedRow as T;
      }
      
      return sanitizeCellValue(row) as T;
    });

  } catch (error) {
    logError('Sheet to JSON conversion failed', {
      component: 'secure-xlsx',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

/**
 * Get workbook info safely without processing all data
 */
export function getWorkbookInfo(workbook: XLSX.WorkBook): {
  sheetNames: string[];
  sheetCount: number;
  totalCells: number;
  estimatedRows: number;
} {
  const sheetNames = workbook.SheetNames || [];
  let totalCells = 0;
  let estimatedRows = 0;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (worksheet) {
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const sheetCells = (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
      totalCells += sheetCells;
      estimatedRows += (range.e.r - range.s.r + 1);
    }
  }

  return {
    sheetNames,
    sheetCount: sheetNames.length,
    totalCells,
    estimatedRows
  };
}