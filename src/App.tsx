// src/App.tsx
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { NextUIProvider } from '@nextui-org/react'
import { DataProvider } from './context/DataContext'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './contexts/AuthContext'
import { HttpsEnforcer } from './components/security/HttpsEnforcer'

// Auth components
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import PrivateRoute from './components/auth/PrivateRoute'

// Dashboard components
import DashboardLayout from './components/layout/DashboardLayout'
import FileUploadPage from './components/dashboard/FileUploadPage'
import MainDashboard from './components/dashboard/MainDashboard'
import DashboardSelector from './components/DashboardSelector'
import DrillingDashboard from './components/dashboard/DrillingDashboard'
import VoyageAnalyticsDashboard from './components/dashboard/VoyageAnalyticsDashboard'
import CostAllocationManagerRedesigned from './components/dashboard/CostAllocationManagerRedesigned'
import ProductionDashboard from './components/dashboard/ProductionDashboard'
import ComparisonDashboard from './components/dashboard/ComparisonDashboard'
import BulkActionsDashboard from './components/dashboard/BulkActionsDashboard'

import './index.css'

function App() {
	return (
		<NextUIProvider>
			<Router>
				<NotificationProvider>
					<AuthProvider>
						<DataProvider>
							<HttpsEnforcer />
							<Routes>
								{/* Public routes */}
								<Route path="/login" element={<Login />} />
								<Route path="/register" element={<Register />} />
								
								{/* Protected routes */}
								<Route path="/" element={
									<PrivateRoute>
										<DashboardLayout>
											<DashboardSelector />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/upload" element={
									<PrivateRoute requiredRole="manager">
										<DashboardLayout>
											<FileUploadPage />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/dashboard" element={
									<PrivateRoute>
										<DashboardLayout>
											<MainDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/drilling" element={
									<PrivateRoute>
										<DashboardLayout>
											<DrillingDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/production" element={
									<PrivateRoute>
										<DashboardLayout>
											<ProductionDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/voyage" element={
									<PrivateRoute>
										<DashboardLayout>
											<VoyageAnalyticsDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/cost" element={
									<PrivateRoute requiredRole="manager">
										<DashboardLayout>
											<CostAllocationManagerRedesigned />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/comparison" element={
									<PrivateRoute>
										<DashboardLayout>
											<ComparisonDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								<Route path="/bulk" element={
									<PrivateRoute>
										<DashboardLayout>
											<BulkActionsDashboard />
										</DashboardLayout>
									</PrivateRoute>
								} />
								
								{/* Catch all - redirect to home */}
								<Route path="*" element={<Navigate to="/" replace />} />
							</Routes>
						</DataProvider>
					</AuthProvider>
				</NotificationProvider>
			</Router>
		</NextUIProvider>
	)
}

export default App