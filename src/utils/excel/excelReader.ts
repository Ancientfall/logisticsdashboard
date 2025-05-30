import * as XLSX from 'xlsx';

/**
 * Excel file reading utilities
 * Extracted from dataProcessing.ts to improve modularity
 */

/**
 * Read a file in chunks to handle large files or browser limitations
 */
const readFileInChunks = async (file: File): Promise<ArrayBuffer> => {
  const chunkSize = 512 * 1024; // Smaller 512KB chunks for better compatibility
  const chunks: Uint8Array[] = [];
  let offset = 0;
  
  console.log(`📦 Reading ${file.name} in ${Math.ceil(file.size / chunkSize)} chunks of ${chunkSize} bytes each`);
  
  while (offset < file.size) {
    const currentOffset = offset; // Capture offset value for closure
    const chunk = file.slice(currentOffset, currentOffset + chunkSize);
    console.log(`📦 Reading chunk ${Math.floor(currentOffset / chunkSize) + 1}/${Math.ceil(file.size / chunkSize)} (${currentOffset}-${Math.min(currentOffset + chunkSize, file.size)})`);
    
    // eslint-disable-next-line no-loop-func
    const chunkBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      
      const timeout = setTimeout(() => {
        reject(new Error(`Chunk read timeout at offset ${currentOffset}`));
      }, 10000); // 10 second timeout per chunk
      
      reader.onload = (event) => {
        clearTimeout(timeout);
        if (event.target?.result instanceof ArrayBuffer) {
          resolve(event.target.result);
        } else {
          reject(new Error(`Chunk read failed at offset ${currentOffset}`));
        }
      };
      
      reader.onerror = (event) => {
        clearTimeout(timeout);
        console.error(`Chunk read error at offset ${currentOffset}:`, event);
        reject(new Error(`Chunk read error at offset ${currentOffset}: ${reader.error?.message || 'Unknown error'}`));
      };
      
      reader.readAsArrayBuffer(chunk);
    });
    
    chunks.push(new Uint8Array(chunkBuffer));
    offset += chunkSize;
    
    // Small delay to prevent overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`📦 Successfully read all ${chunks.length} chunks, combining...`);
  
  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  
  console.log(`📦 Combined ${chunks.length} chunks into ${totalLength} bytes`);
  return result.buffer;
};

/**
 * Read a file using URL.createObjectURL and fetch - bypasses some blob restrictions
 */
const readFileViaURL = async (file: File): Promise<ArrayBuffer> => {
  console.log(`🔗 Creating object URL for ${file.name}...`);
  const url = URL.createObjectURL(file);
  
  try {
    console.log(`🔗 Fetching file via URL for ${file.name}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}: ${response.statusText}`);
    }
    
    console.log(`🔗 Converting response to array buffer for ${file.name}...`);
    const buffer = await response.arrayBuffer();
    
    console.log(`🔗 Successfully read ${buffer.byteLength} bytes via URL for ${file.name}`);
    return buffer;
  } finally {
    // Always clean up the object URL
    URL.revokeObjectURL(url);
    console.log(`🔗 Cleaned up object URL for ${file.name}`);
  }
};

/**
 * Read an Excel file and return its data as an array of objects
 */
export const readExcelFile = async <T>(file: File): Promise<T[]> => {
  try {
    console.log(`📖 Reading Excel file: ${file.name}`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`File ${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 50MB.`);
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      throw new Error(`File ${file.name} must be an Excel file (.xlsx or .xls)`);
    }

    console.log(`🔄 Converting ${file.name} to array buffer...`);
    
    // Try multiple methods for reading the file to handle WebKit/Safari issues
    let buffer: ArrayBuffer;
    let readMethod = 'unknown';
    
    // Method 1: Try FileReader first (more reliable for large files in Safari)
    try {
      console.log(`📖 Attempting FileReader method for ${file.name}...`);
      buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          if (event.target?.result instanceof ArrayBuffer) {
            console.log(`✅ FileReader succeeded for ${file.name}`);
            resolve(event.target.result);
          } else {
            reject(new Error('FileReader did not return ArrayBuffer'));
          }
        };
        
        reader.onerror = (event) => {
          console.error(`❌ FileReader failed for ${file.name}:`, event);
          reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown FileReader error'}`));
        };
        
        reader.onabort = () => {
          reject(new Error('FileReader was aborted'));
        };
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reader.abort();
          reject(new Error('FileReader timeout after 30 seconds'));
        }, 30000);
        
        reader.onloadend = () => {
          clearTimeout(timeout);
        };
        
        reader.readAsArrayBuffer(file);
      });
      readMethod = 'FileReader';
    } catch (fileReaderError) {
      console.warn(`⚠️ FileReader failed for ${file.name}:`, fileReaderError);
      
      // Method 2: Try file.arrayBuffer() as fallback
      try {
        console.log(`📖 Attempting arrayBuffer() method for ${file.name}...`);
        buffer = await file.arrayBuffer();
        readMethod = 'arrayBuffer';
        console.log(`✅ arrayBuffer() succeeded for ${file.name}`);
      } catch (arrayBufferError) {
        console.error(`❌ arrayBuffer() also failed for ${file.name}:`, arrayBufferError);
        
        // Method 3: Try reading in chunks as last resort
        try {
          console.log(`📖 Attempting chunked read for ${file.name}...`);
          buffer = await readFileInChunks(file);
          readMethod = 'chunked';
          console.log(`✅ Chunked read succeeded for ${file.name}`);
        } catch (chunkedError) {
          console.error(`❌ Chunked read also failed for ${file.name}:`, chunkedError);
          
          // Method 4: Try URL-based approach as absolute last resort
          try {
            console.log(`📖 Attempting URL-based read for ${file.name}...`);
            buffer = await readFileViaURL(file);
            readMethod = 'URL-based';
            console.log(`✅ URL-based read succeeded for ${file.name}`);
          } catch (urlError) {
            console.error(`❌ All read methods failed for ${file.name}:`, urlError);
            const fileReaderMsg = fileReaderError instanceof Error ? fileReaderError.message : String(fileReaderError);
            const arrayBufferMsg = arrayBufferError instanceof Error ? arrayBufferError.message : String(arrayBufferError);
            const chunkedMsg = chunkedError instanceof Error ? chunkedError.message : String(chunkedError);
            const urlMsg = urlError instanceof Error ? urlError.message : String(urlError);
            throw new Error(`Failed to read file ${file.name}. All methods failed: FileReader: ${fileReaderMsg}, arrayBuffer: ${arrayBufferMsg}, chunked: ${chunkedMsg}, URL-based: ${urlMsg}`);
          }
        }
      }
    }
    
    console.log(`✅ Array buffer created for ${file.name} using ${readMethod}, size: ${buffer.byteLength} bytes`);
    
    if (buffer.byteLength === 0) {
      throw new Error(`File ${file.name} appears to be empty or corrupted`);
    }
    
    console.log(`📊 Parsing Excel workbook for ${file.name}...`);
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error(`No sheets found in Excel file ${file.name}`);
    }
    
    const firstSheetName = workbook.SheetNames[0];
    console.log(`📋 Reading sheet "${firstSheetName}" from ${file.name} (available sheets: ${workbook.SheetNames.join(', ')})`);
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${firstSheetName}" not found in ${file.name}`);
    }
    
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: '',
      blankrows: false
    });
    
    console.log(`✅ Successfully read ${data.length} rows from ${file.name}`);
    
    if (data.length === 0) {
      throw new Error(`No data found in sheet "${firstSheetName}" of file ${file.name}`);
    }
    
    return data as T[];
  } catch (error) {
    console.error(`❌ Error reading Excel file ${file.name}:`, error);
    throw new Error(`Failed to read Excel file ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 