// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { NextUIProvider } from '@nextui-org/react'
import { DataProvider, useData } from './context/DataContext'
import { NotificationProvider } from './context/NotificationContext'
import { HttpsEnforcer } from './components/security/HttpsEnforcer'
import LoadingBoundary from './components/layout/LoadingBoundary'

// Dashboard components
import DashboardLayout from './components/layout/DashboardLayout'
import EnhancedFileUploadWithServer from './components/EnhancedFileUploadWithServer'
import DashboardShowcase from './components/DashboardShowcase'
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
import TVKioskDisplay from './components/TVKioskDisplay'
import AviationDashboard from './components/aviation/AviationDashboard'
import VesselRequirementDashboard from './components/dashboard/VesselRequirementDashboard'
import VesselForecastDashboard from './components/dashboard/VesselForecastDashboard'

import './index.css'

// Wrapper component to use navigation
const LandingPageWrapper: React.FC = () => {
	const navigate = useNavigate()
	const { isDataReady, voyageEvents } = useData()
	
	// Check if we have actual data loaded
	const hasData = isDataReady && voyageEvents.length > 0
	
	return (
		<LandingPage 
			onGetStarted={() => navigate('/upload')} 
			onViewDashboard={() => navigate('/dashboards')} 
			hasData={hasData} 
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
										<EnhancedFileUploadWithServer />
									</DashboardLayout>
								} />
								
								
								<Route path="/dashboards" element={<DashboardShowcase />} />
								
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
								
								<Route path="/vessel-requirements" element={
									<DashboardLayout>
										<VesselRequirementDashboard />
									</DashboardLayout>
								} />
								
								<Route path="/vessel-forecast" element={
									<DashboardLayout>
										<VesselForecastDashboard />
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
								
								{/* TV Kiosk Display - fullscreen mode for large displays */}
								<Route path="/tv-display" element={<TVKioskDisplay />} />
								
								{/* Aviation Dashboard - standalone dashboard */}
								<Route path="/aviation" element={<AviationDashboard />} />
								
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