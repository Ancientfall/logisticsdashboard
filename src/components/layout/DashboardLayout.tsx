import React from 'react';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const BPLogo: React.FC = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" className="bp-logo">
    <defs>
      <linearGradient id="bpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFCB05" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#FFA500" />
      </linearGradient>
    </defs>
    
    {/* BP Helios Sun rays */}
    <g transform="translate(50,50)">
      {/* Outer rays */}
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(0)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(45)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(90)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(135)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(180)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(225)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(270)" />
      <path d="M0,-40 L5,-25 L-5,-25 Z" fill="url(#bpGradient)" transform="rotate(315)" />
      
      {/* Inner rays */}
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(22.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(67.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(112.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(157.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(202.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(247.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(292.5)" />
      <path d="M0,-30 L3,-18 L-3,-18 Z" fill="#00914F" transform="rotate(337.5)" />
      
      {/* Center circle */}
      <circle r="12" fill="#00914F" />
    </g>
  </svg>
);

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <BPLogo />
            <div className="brand-text">
              <h1 className="dashboard-title">BP Logistics Dashboard</h1>
              <p className="dashboard-subtitle">Offshore Vessel Operations Analytics</p>
            </div>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
