import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Database, Factory, CheckCircle, ArrowRight } from 'lucide-react';
import './FileUploadPage.css';

const FileUploadPage: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // File processing will be implemented in Phase 2
  };

  return (
    <div className="file-upload-container">
      <div className="upload-hero">
        <div className="hero-icon">
          <Database className="main-icon" />
        </div>
        <h2 className="hero-title">Transform Your Data</h2>
        <p className="hero-subtitle">
          Upload your Excel files to unlock powerful insights and analytics
        </p>
      </div>

      <div 
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-icon-container">
          <Upload className="upload-icon" />
        </div>
        <h3 className="upload-title">Drag & Drop Files Here</h3>
        <p className="upload-description">or click to browse</p>
        
        <div className="file-requirements">
          <div className="requirement-item">
            <FileSpreadsheet className="req-icon" />
            <span>Voyage Events.xlsx</span>
            <CheckCircle className="check-icon" />
          </div>
          <div className="requirement-item">
            <FileSpreadsheet className="req-icon" />
            <span>Vessel Manifests.xlsx</span>
            <CheckCircle className="check-icon" />
          </div>
          <div className="requirement-item">
            <Factory className="req-icon" />
            <span>Master Facilities.xlsx</span>
            <CheckCircle className="check-icon" />
          </div>
        </div>

        <button className="upload-button">
          <Upload size={20} />
          Choose Files
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h4>Lightning Fast</h4>
          <p>Process files instantly in your browser</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h4>Secure & Private</h4>
          <p>Your data never leaves your device</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h4>Advanced Analytics</h4>
          <p>Powerful insights and visualizations</p>
        </div>
      </div>
    </div>
  );
};

export default FileUploadPage;
