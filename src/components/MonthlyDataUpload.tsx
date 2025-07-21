/**
 * Monthly Data Upload Component - BP Design System
 * 
 * This component allows uploading Kabal Excel exports and replacing the
 * corresponding server-side files. The dashboard will automatically use
 * the existing processors to handle the updated data.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, Progress, Chip } from '@nextui-org/react';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  X, 
  ArrowLeft,
  Database,
  Calendar,
  TrendingUp,
  Zap,
  ArrowRight,
  Home
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface FileUploadStatus {
  file: File;
  targetFileName: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FileMapping {
  pattern: RegExp;
  targetFile: string;
  description: string;
}

const MonthlyDataUpload: React.FC = () => {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [uploadStatus, setUploadStatus] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track mouse position for interactive gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // File mapping patterns to determine target files
  const FILE_MAPPINGS: FileMapping[] = [
    {
      pattern: /voyage.*event/i,
      targetFile: 'Voyage Events.xlsx',
      description: 'Voyage Events - Event-level vessel activity data'
    },
    {
      pattern: /manifest|cargo/i,
      targetFile: 'Vessel Manifests.xlsx',
      description: 'Vessel Manifests - Cargo manifest and tonnage data'
    },
    {
      pattern: /bulk.*action|bulk.*transfer/i,
      targetFile: 'Bulk Actions.xlsx',
      description: 'Bulk Actions - Bulk fluid transfer operations'
    },
    {
      pattern: /cost.*allocation/i,
      targetFile: 'Cost Allocation.xlsx',
      description: 'Cost Allocation - Cost allocation and LC mapping'
    },
    {
      pattern: /voyage.*list/i,
      targetFile: 'Voyage List.xlsx',
      description: 'Voyage List - Voyage summaries and routes'
    }
  ];

  const identifyTargetFile = useCallback((fileName: string): FileMapping | null => {
    return FILE_MAPPINGS.find(mapping => mapping.pattern.test(fileName)) || null;
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    
    try {
      console.log('📤 Starting monthly file upload...');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mapping = identifyTargetFile(file.name);
        
        if (!mapping) {
          setUploadStatus(prev => prev.map((status, index) => 
            index === i ? { 
              ...status, 
              status: 'error', 
              progress: 100,
              error: 'Unknown file type - could not determine target file'
            } : status
          ));
          continue;
        }

        // Update status to uploading
        setUploadStatus(prev => prev.map((status, index) => 
          index === i ? { ...status, status: 'uploading', progress: 25 } : status
        ));

        try {
          // Upload file to server
          const success = await uploadFileToServer(file, mapping.targetFile);
          
          if (success) {
            // Update status to completed
            setUploadStatus(prev => prev.map((status, index) => 
              index === i ? { 
                ...status, 
                status: 'completed', 
                progress: 100
              } : status
            ));
          } else {
            throw new Error('Upload failed');
          }
          
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          
          setUploadStatus(prev => prev.map((status, index) => 
            index === i ? { 
              ...status, 
              status: 'error', 
              progress: 100,
              error: error instanceof Error ? error.message : 'Upload failed'
            } : status
          ));
        }
      }

      const completedCount = uploadStatus.filter(s => s.status === 'completed').length;
      const errorCount = uploadStatus.filter(s => s.status === 'error').length;

      if (completedCount > 0) {
        addNotification('upload-success', {
          message: `Monthly data appended successfully!`,
          details: `Successfully processed ${completedCount} files. New data has been added to existing files. Refresh the dashboard to see the updated data.`
        });
      }

      if (errorCount > 0) {
        addNotification('system-error', {
          message: `Some files failed to upload`,
          details: `${errorCount} files had errors. Check the upload status for details.`
        });
      }

    } catch (error) {
      console.error('❌ Monthly upload process failed:', error);
      addNotification('system-error', {
        message: 'Upload process failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [addNotification, uploadStatus]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Create upload status for each file
    const initialStatus: FileUploadStatus[] = files.map(file => {
      const mapping = identifyTargetFile(file.name);
      return {
        file,
        targetFileName: mapping?.targetFile || 'Unknown',
        status: 'pending',
        progress: 0
      };
    });

    setUploadStatus(initialStatus);
    
    // Auto-start upload
    processFiles(files);
  }, [identifyTargetFile, processFiles]);

  const uploadFileToServer = async (file: File, targetFileName: string): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFileName', targetFileName);

    // Use proxy setup for development - React dev server will proxy to 5001
    const uploadUrl = '/api/upload-monthly-data';

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Log the append results
      if (result.success) {
        console.log(`📊 Monthly data append completed:`, {
          action: result.action,
          newRowsAdded: result.newRowsAdded,
          duplicatesSkipped: result.duplicatesSkipped
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Server upload error:', error);
      return false;
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create upload status for each file
      const initialStatus: FileUploadStatus[] = files.map(file => {
        const mapping = identifyTargetFile(file.name);
        return {
          file,
          targetFileName: mapping?.targetFile || 'Unknown',
          status: 'pending',
          progress: 0
        };
      });

      setUploadStatus(initialStatus);
      
      // Auto-start upload
      processFiles(files);
    }
  }, [identifyTargetFile, processFiles]);

  const clearUpload = () => {
    setUploadStatus([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'uploading':
        return 'primary';
      case 'completed':
        return 'success';
      case 'error':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Dynamic gradient background */}
      <div 
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 117, 79, 0.1), transparent 50%)`
        }}
      />

      {/* Header */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-6">
          {/* Navigation */}
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">bp</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">BP Logistics Monthly Update</h1>
                <p className="text-sm text-gray-600">Data Append & Processing System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                startContent={<Home className="w-4 h-4" />}
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </Button>
              <Button
                variant="flat"
                color="primary"
                onClick={() => navigate('/dashboards')}
                startContent={<ArrowLeft className="w-4 h-4" />}
                className="bg-green-100 text-green-700 hover:bg-green-200"
              >
                Back to Dashboards
              </Button>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-3xl blur-xl" />
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Monthly Data Upload Center</h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Seamlessly append your monthly Kabal Excel exports to existing server files. 
                    Our intelligent system automatically processes and integrates new data with historical records.
                  </p>
                </div>
              </div>
              
              {/* Feature highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Smart Detection</p>
                    <p className="text-sm text-green-700">Auto-identifies file types</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <Database className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Duplicate Prevention</p>
                    <p className="text-sm text-blue-700">Intelligent data merging</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <Zap className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="font-semibold text-purple-900">Instant Processing</p>
                    <p className="text-sm text-purple-700">Real-time data integration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-12">

        {/* Upload Area */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5 rounded-2xl blur-sm" />
          <Card className="relative shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Upload Monthly Files</h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div
                className="border-2 border-dashed border-green-200 rounded-2xl p-12 text-center hover:border-green-300 hover:bg-green-50/50 transition-all duration-300 cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Upload className="w-10 h-10 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  Drop your Excel files here
                </h4>
                <p className="text-gray-600 mb-2 text-lg">
                  Or click to browse and select files
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Supports: Voyage Events • Vessel Manifests • Bulk Actions • Cost Allocation • Voyage List
                </p>
                
                <Button
                  color="primary"
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg px-8 py-3 text-white font-semibold"
                  disabled={isUploading}
                  endContent={<ArrowRight className="w-5 h-5" />}
                >
                  {isUploading ? 'Processing...' : 'Choose Files'}
                </Button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* File Mapping Reference */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-2xl blur-sm" />
          <Card className="relative shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Supported File Types</h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FILE_MAPPINGS.map((mapping, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Database className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 mb-1">{mapping.targetFile}</p>
                        <p className="text-sm text-gray-600 mb-2">{mapping.description}</p>
                        <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                          {mapping.pattern.toString().replace(/\//g, '').replace('i', ' (case-insensitive)')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Upload Progress */}
        {uploadStatus.length > 0 && (
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-2xl blur-sm" />
            <Card className="relative shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Upload Progress</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearUpload}
                    disabled={isUploading}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="space-y-4">
                  {uploadStatus.map((status, index) => (
                    <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(status.status)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">
                                {status.file.name}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <ArrowRight className="w-3 h-3" />
                                {status.targetFileName}
                              </p>
                            </div>
                            <Chip
                              size="sm"
                              color={getStatusColor(status.status)}
                              variant="flat"
                              className="font-semibold"
                            >
                              {status.status.toUpperCase()}
                            </Chip>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Progress
                              value={status.progress}
                              size="sm"
                              className="flex-1"
                              color={status.status === 'completed' ? 'success' : status.status === 'error' ? 'danger' : 'primary'}
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                              {Math.round(status.progress)}%
                            </span>
                          </div>
                          
                          {status.error && (
                            <p className="text-sm text-red-600 mt-2 p-2 bg-red-50 rounded-lg border border-red-100">{status.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Instructions */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl blur-sm" />
          <Card className="relative shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">How It Works</h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">Smart Upload</h4>
                    <p className="text-gray-600">
                      Upload your monthly Kabal Excel exports. Our intelligent system automatically identifies which server file to append to based on filename patterns.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">Data Integration</h4>
                    <p className="text-gray-600">
                      New data is seamlessly appended to existing Excel files. Our anti-duplication engine automatically detects and skips duplicate records.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">Automatic Processing</h4>
                    <p className="text-gray-600">
                      The dashboard automatically processes the combined files. All existing processors (LC integration, vessel classification, cost allocation) handle both historical and new data.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 text-lg">Instant Analytics</h4>
                    <p className="text-gray-600">
                      Refresh the dashboard to see the combined data reflected in all analytics and visualizations with complete historical trends and insights.
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Next Steps After Upload
                </h4>
                <div className="flex flex-col md:flex-row gap-4">
                  <Button
                    onClick={() => navigate('/dashboards')}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg text-white font-semibold"
                    endContent={<ArrowRight className="w-4 h-4" />}
                  >
                    View Analytics Dashboards
                  </Button>
                  <Button
                    variant="flat"
                    onClick={() => navigate('/dashboard')}
                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
                    endContent={<Database className="w-4 h-4" />}
                  >
                    Check Data Processing
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MonthlyDataUpload;