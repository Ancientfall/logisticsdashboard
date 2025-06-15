import React, { useState } from 'react'
import { 
	Anchor, 
	Activity, 
	BarChart3, 
	Ship, 
	DollarSign,
	Layers,
	ArrowRight,
	Zap,
	Target,
	TrendingUp,
	CheckCircle
} from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardSelectorProps {
	onNavigateToDrilling: () => void
	onNavigateToProduction: () => void
	onNavigateToComparison: () => void
	onNavigateToVoyage: () => void
	onNavigateToCost: () => void
	onNavigateToOverview: () => void
	onNavigateToLanding?: () => void
}

interface DashboardOption {
	id: string
	title: string
	subtitle: string
	description: string
	icon: React.ElementType
	gradient: string
	features: string[]
	metrics: { label: string; value: string }[]
	action: () => void
}

const DashboardSelector: React.FC<DashboardSelectorProps> = ({
	onNavigateToDrilling,
	onNavigateToProduction,
	onNavigateToComparison,
	onNavigateToVoyage,
	onNavigateToCost,
	onNavigateToOverview,
	onNavigateToLanding
}) => {
	const [hoveredCard, setHoveredCard] = useState<string | null>(null)
	const [selectedCategory, setSelectedCategory] = useState<'all' | 'operations' | 'analytics' | 'financial'>('all')

	const dashboardOptions: DashboardOption[] = [
		{
			id: 'drilling',
			title: 'Drilling Operations',
			subtitle: 'Thunder Horse & Mad Dog',
			description: 'Real-time drilling analytics with intelligent LC-based cost allocation and performance tracking',
			icon: Anchor,
			gradient: 'from-blue-500 to-cyan-600',
			features: [
				'Well-specific cost tracking',
				'LC allocation analysis',
				'Real-time monitoring',
				'Efficiency metrics'
			],
			metrics: [
				{ label: 'Active Wells', value: '12' },
				{ label: 'Efficiency', value: '94%' },
				{ label: 'Cost Savings', value: '$1.2M' }
			],
			action: onNavigateToDrilling
		},
		{
			id: 'production',
			title: 'Production Analytics',
			subtitle: 'Facility Performance',
			description: 'Monitor production facilities with vessel operation tracking and performance KPIs',
			icon: Activity,
			gradient: 'from-purple-500 to-pink-600',
			features: [
				'Facility monitoring',
				'Vessel visit tracking',
				'Production efficiency',
				'Performance trending'
			],
			metrics: [
				{ label: 'Facilities', value: '8' },
				{ label: 'Uptime', value: '98.5%' },
				{ label: 'Vessels', value: '24' }
			],
			action: onNavigateToProduction
		},
		{
			id: 'voyage',
			title: 'Voyage Intelligence',
			subtitle: 'Fleet Operations',
			description: 'Comprehensive voyage analytics with route optimization and operational insights',
			icon: Ship,
			gradient: 'from-green-500 to-emerald-600',
			features: [
				'Route analysis',
				'Port operations',
				'Mission tracking',
				'Timeline analytics'
			],
			metrics: [
				{ label: 'Voyages', value: '157' },
				{ label: 'Routes', value: '32' },
				{ label: 'On-Time', value: '87%' }
			],
			action: onNavigateToVoyage
		},
		{
			id: 'cost',
			title: 'Cost Allocation',
			subtitle: 'Financial Intelligence',
			description: 'Smart cost distribution across drilling and production with department-level insights',
			icon: DollarSign,
			gradient: 'from-orange-500 to-red-600',
			features: [
				'Smart allocation',
				'Budget tracking',
				'Department analysis',
				'Trend visualization'
			],
			metrics: [
				{ label: 'Tracked', value: '$42M' },
				{ label: 'Savings', value: '15%' },
				{ label: 'Accuracy', value: '99.2%' }
			],
			action: onNavigateToCost
		},
		{
			id: 'comparison',
			title: 'Comparison Analytics',
			subtitle: 'Cross-Platform Analysis',
			description: 'Compare performance across vessels, facilities, and time periods for insights',
			icon: Layers,
			gradient: 'from-indigo-500 to-purple-600',
			features: [
				'Multi-vessel analysis',
				'Trend comparison',
				'Performance gaps',
				'Benchmarking'
			],
			metrics: [
				{ label: 'Comparisons', value: '450' },
				{ label: 'Insights', value: '89' },
				{ label: 'Improved', value: '23%' }
			],
			action: onNavigateToComparison
		},
		{
			id: 'overview',
			title: 'Executive Overview',
			subtitle: 'Unified Dashboard',
			description: 'High-level view of all operations with key metrics and performance indicators',
			icon: BarChart3,
			gradient: 'from-gray-600 to-gray-800',
			features: [
				'KPI dashboard',
				'Executive summary',
				'Alert monitoring',
				'Quick insights'
			],
			metrics: [
				{ label: 'KPIs', value: '24' },
				{ label: 'Alerts', value: '3' },
				{ label: 'Updated', value: 'Live' }
			],
			action: onNavigateToOverview
		}
	]

	const getFilteredDashboards = () => {
		switch (selectedCategory) {
			case 'operations':
				return dashboardOptions.filter(d => ['drilling', 'production', 'voyage'].includes(d.id))
			case 'analytics':
				return dashboardOptions.filter(d => ['comparison', 'overview'].includes(d.id))
			case 'financial':
				return dashboardOptions.filter(d => ['cost'].includes(d.id))
			default:
				return dashboardOptions
		}
	}

	const categoryButtons = [
		{ id: 'all', label: 'All Dashboards', icon: BarChart3 },
		{ id: 'operations', label: 'Operations', icon: Anchor },
		{ id: 'analytics', label: 'Analytics', icon: TrendingUp },
		{ id: 'financial', label: 'Financial', icon: DollarSign }
	]

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
			{/* Header */}
			<div className="bg-white shadow-sm border-b border-gray-200">
				<div className="max-w-7xl mx-auto px-6 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-8">
							{/* Logo - clickable to go back to landing */}
							<div 
								onClick={onNavigateToLanding}
								className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
									<span className="text-white font-bold text-xl">bp</span>
								</div>
								<div>
									<h2 className="text-xl font-bold text-gray-900">Logistics Analytics</h2>
									<p className="text-xs text-gray-600">Dashboard Selection</p>
								</div>
							</div>
							<div className="border-l border-gray-200 pl-8">
								<h1 className="text-2xl font-bold text-gray-900">Select Your Dashboard</h1>
								<p className="text-gray-600 mt-1">Choose the analytics view that best suits your needs</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
								<CheckCircle size={16} />
								<span className="text-sm font-medium">Data Loaded Successfully</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Category Filter */}
			<div className="max-w-7xl mx-auto px-6 py-8">
				<div className="flex items-center gap-3 flex-wrap">
					{categoryButtons.map((category) => {
						const Icon = category.icon
						return (
							<button
								key={category.id}
								onClick={() => setSelectedCategory(category.id as any)}
								className={`
									flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
									${selectedCategory === category.id 
										? 'bg-green-500 text-white shadow-lg' 
										: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
									}
								`}
							>
								<Icon size={18} />
								{category.label}
							</button>
						)
					})}
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-6 pb-16">
				{/* Primary Options - Drilling & Production */}
				{selectedCategory === 'all' && (
					<div className="mb-12">
						<h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
							<Zap className="text-yellow-500" size={20} />
							Primary Operations
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{dashboardOptions.filter(d => ['drilling', 'production'].includes(d.id)).map((dashboard, index) => {
								const Icon = dashboard.icon
								return (
									<motion.div
										key={dashboard.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1 }}
										onMouseEnter={() => setHoveredCard(dashboard.id)}
										onMouseLeave={() => setHoveredCard(null)}
										className="relative group"
									>
										<div 
											onClick={dashboard.action}
											className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1"
										>
											{/* Gradient overlay */}
											<div className={`absolute inset-0 bg-gradient-to-br ${dashboard.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
											
											<div className="relative z-10">
												<div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${dashboard.gradient} rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
													<Icon className="text-white" size={32} />
												</div>
												
												<h3 className="text-2xl font-bold text-gray-900 mb-1">{dashboard.title}</h3>
												<p className="text-sm text-gray-500 mb-4">{dashboard.subtitle}</p>
												<p className="text-gray-600 mb-6">{dashboard.description}</p>
												
												<div className="grid grid-cols-3 gap-4 mb-6">
													{dashboard.metrics.map((metric, idx) => (
														<div key={idx} className="text-center">
															<div className="text-2xl font-bold text-gray-900">{metric.value}</div>
															<div className="text-xs text-gray-500">{metric.label}</div>
														</div>
													))}
												</div>
												
												<div className="flex items-center justify-between">
													<div className="space-y-1">
														{dashboard.features.slice(0, 2).map((feature, idx) => (
															<div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
																<CheckCircle className="text-green-500" size={14} />
																<span>{feature}</span>
															</div>
														))}
													</div>
													<ArrowRight className={`text-gray-400 group-hover:text-${dashboard.gradient.split('-')[1]}-500 transition-all duration-300 group-hover:translate-x-2`} size={24} />
												</div>
											</div>
										</div>
									</motion.div>
								)
							})}
						</div>
					</div>
				)}

				{/* Other Dashboards */}
				<div>
					{selectedCategory === 'all' && (
						<h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
							<Target className="text-blue-500" size={20} />
							Additional Analytics
						</h2>
					)}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{getFilteredDashboards()
							.filter(d => selectedCategory !== 'all' || !['drilling', 'production'].includes(d.id))
							.map((dashboard, index) => {
								const Icon = dashboard.icon
								return (
									<motion.div
										key={dashboard.id}
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.1 }}
										onMouseEnter={() => setHoveredCard(dashboard.id)}
										onMouseLeave={() => setHoveredCard(null)}
										className="relative group"
									>
										<div 
											onClick={dashboard.action}
											className="relative bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1 h-full"
										>
											{/* Gradient overlay */}
											<div className={`absolute inset-0 bg-gradient-to-br ${dashboard.gradient} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`} />
											
											<div className="relative z-10">
												<div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${dashboard.gradient} rounded-xl mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
													<Icon className="text-white" size={24} />
												</div>
												
												<h3 className="text-xl font-bold text-gray-900 mb-1">{dashboard.title}</h3>
												<p className="text-xs text-gray-500 mb-3">{dashboard.subtitle}</p>
												<p className="text-sm text-gray-600 mb-4 line-clamp-2">{dashboard.description}</p>
												
												<div className="space-y-1 mb-4">
													{dashboard.features.slice(0, 2).map((feature, idx) => (
														<div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
															<CheckCircle className="text-green-500" size={12} />
															<span>{feature}</span>
														</div>
													))}
												</div>
												
												<div className="flex items-center justify-between pt-4 border-t border-gray-100">
													<div className="flex items-center gap-3">
														{dashboard.metrics.slice(0, 2).map((metric, idx) => (
															<div key={idx} className="text-center">
																<div className="text-sm font-bold text-gray-900">{metric.value}</div>
																<div className="text-xs text-gray-500">{metric.label}</div>
															</div>
														))}
													</div>
													<ArrowRight className="text-gray-400 group-hover:text-gray-600 transition-all duration-300 group-hover:translate-x-1" size={20} />
												</div>
											</div>
										</div>
									</motion.div>
								)
							})}
					</div>
				</div>
			</div>

			{/* Quick Actions Footer */}
			<div className="bg-white border-t border-gray-200 py-6">
				<div className="max-w-7xl mx-auto px-6">
					<div className="flex items-center justify-between">
						<div className="text-sm text-gray-600">
							Select a dashboard to begin exploring your operational data
						</div>
						<button
							onClick={onNavigateToOverview}
							className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
						>
							Go to Executive Overview
							<ArrowRight size={16} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default DashboardSelector