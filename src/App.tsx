// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { NextUIProvider } from '@nextui-org/react'
import { DataProvider } from './context/DataContext'
import { NotificationProvider } from './context/NotificationContext'
import { HttpsEnforcer } from './components/security/HttpsEnforcer'
import LoadingBoundary from './components/layout/LoadingBoundary'

// Dashboard components
import DashboardLayout from './components/layout/DashboardLayout'
import FileUploadPageWithDB from './components/dashboard/FileUploadPageWithDB'
import MainDashboard from './components/dashboard/MainDashboard'
import DrillingDashboard from './components/dashboard/DrillingDashboard'
import VoyageAnalyticsDashboard from './components/dashboard/VoyageAnalyticsDashboard'
import CostAllocationManagerRedesigned from './components/dashboard/CostAllocationManagerRedesigned'
import ProductionDashboard from './components/dashboard/ProductionDashboard'
import ComparisonDashboard from './components/dashboard/ComparisonDashboard'
import BulkActionsDashboard from './components/dashboard/BulkActionsDashboard'
import LandingPage from './components/LandingPage'
import AdminDashboard from './components/admin/AdminDashboard'
import ReferenceDataManager from './components/admin/ReferenceDataManager'

import './index.css'

// Wrapper component to use navigation
const LandingPageWrapper: React.FC = () => {
	const navigate = useNavigate()
	
	return (
		<LandingPage 
			onGetStarted={() => navigate('/dashboard')} 
			onViewDashboard={() => navigate('/dashboard')} 
			hasData={false} 
		/>
	)
}

function App() {
	return (
		<NextUIProvider>
			<Router>
				<LoadingBoundary>
					<NotificationProvider>
						<DataProvider>
							<HttpsEnforcer />
							<Routes>
								{/* Public routes */}
								<Route path="/" element={<LandingPageWrapper />} />
								
								{/* Dashboard routes - no authentication required */}
								<Route path="/upload" element={
									<DashboardLayout>
										<FileUploadPageWithDB />
									</DashboardLayout>
								} />
								
								<Route path="/dashboard" element={
									<DashboardLayout>
										<MainDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/drilling" element={
									<DashboardLayout>
										<DrillingDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/production" element={
									<DashboardLayout>
										<ProductionDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/voyage" element={
									<DashboardLayout>
										<VoyageAnalyticsDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/cost" element={
									<DashboardLayout>
										<CostAllocationManagerRedesigned />
									</DashboardLayout>
								} />
								
								<Route path="/comparison" element={
									<DashboardLayout>
										<ComparisonDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/bulk" element={
									<DashboardLayout>
										<BulkActionsDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/admin" element={
									<DashboardLayout>
										<AdminDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/admin/reference" element={
									<DashboardLayout>
										<ReferenceDataManager />
									</DashboardLayout>
								} />
								
								{/* Catch all - redirect to home */}
								<Route path="*" element={<Navigate to="/" replace />} />
							</Routes>
						</DataProvider>
					</NotificationProvider>
				</LoadingBoundary>
			</Router>
		</NextUIProvider>
	)
}

export default App