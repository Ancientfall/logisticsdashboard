import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
	Ship, 
	BarChart3, 
	Database, 
	Zap, 
	ArrowRight,
	CheckCircle,
	DollarSign,
	Anchor,
	Activity,
	Layers,
	Target,
	ChevronRight,
	Sparkles,
	LogIn,
	UserPlus
} from 'lucide-react'
import { Button } from '@nextui-org/react'

const PublicLandingPage: React.FC = () => {
	const navigate = useNavigate()
	const [currentStat, setCurrentStat] = useState(0)
	const [isVisible, setIsVisible] = useState(false)
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

	// Track mouse position for interactive gradient
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY })
		}
		window.addEventListener('mousemove', handleMouseMove)
		return () => window.removeEventListener('mousemove', handleMouseMove)
	}, [])

	const stats = [
		{ value: '5', label: 'Analytics Dashboards', icon: BarChart3, suffix: '' },
		{ value: '10+', label: 'Facilities Tracked', icon: Anchor, suffix: '' },
		{ value: '24/7', label: 'Real-time Updates', icon: Activity, suffix: '' },
		{ value: '99.8', label: 'Data Accuracy', icon: Target, suffix: '%' }
	]

	const dashboards = [
		{
			id: 'drilling',
			title: 'Drilling Dashboard',
			description: 'Monitor drilling operations across all offshore facilities with real-time vessel tracking',
			icon: Anchor,
			gradient: 'from-blue-600 to-cyan-500',
			features: ['Drilling location activity', 'Vessel utilization metrics', 'Cost allocation tracking', 'Real-time operations monitoring']
		},
		{
			id: 'production',
			title: 'Production Analytics',
			description: 'Track production facility performance with comprehensive vessel and cost analysis',
			icon: Activity,
			gradient: 'from-emerald-600 to-green-500',
			features: ['Facility operations tracking', 'Production vessel activity', 'Performance trend analysis', 'Cost metrics visualization']
		},
		{
			id: 'voyage',
			title: 'Voyage Intelligence',
			description: 'Comprehensive voyage analytics with route optimization and duration insights',
			icon: Ship,
			gradient: 'from-purple-600 to-pink-500',
			features: ['Voyage duration analysis', 'Route optimization', 'Purpose distribution', 'Vessel type filtering']
		},
		{
			id: 'cost',
			title: 'Cost Allocation',
			description: 'Intelligent cost management with department and location-based distribution',
			icon: DollarSign,
			gradient: 'from-orange-600 to-red-500',
			features: ['Department cost tracking', 'Location-based allocation', 'Budget trend analysis', 'Smart cost distribution']
		},
		{
			id: 'comparison',
			title: 'Comparison Analytics',
			description: 'Multi-dimensional comparative analysis across time, locations, and operations',
			icon: Layers,
			gradient: 'from-indigo-600 to-purple-500',
			features: ['Multi-facility comparison', 'Time period analysis', 'Department benchmarking', 'Performance gap identification']
		}
	]

	const workflow = [
		{
			step: 1,
			title: 'Upload Data',
			description: 'Import Excel files with voyage events, vessel manifests, and operational data',
			icon: Database
		},
		{
			step: 2,
			title: 'Intelligent Processing',
			description: 'Automated data validation, deduplication, and smart cost allocation',
			icon: Zap
		},
		{
			step: 3,
			title: 'Actionable Insights',
			description: 'Access five specialized dashboards with real-time analytics and comparisons',
			icon: BarChart3
		}
	]

	useEffect(() => {
		setIsVisible(true)
		const interval = setInterval(() => {
			setCurrentStat((prev) => (prev + 1) % stats.length)
		}, 3000)
		return () => clearInterval(interval)
	}, [stats.length])

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
			{/* Animated Background */}
			<div 
				className="fixed inset-0 opacity-30"
				style={{
					background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 117, 79, 0.3) 0%, transparent 50%)`
				}}
			/>
			
			{/* Hero Section */}
			<header className="relative z-10">
				<nav className="px-8 py-6 flex justify-between items-center">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-gradient-to-br from-[#00754F] to-[#00A770] rounded-lg flex items-center justify-center">
							<Ship size={24} className="text-white" />
						</div>
						<span className="text-2xl font-bold text-white">BP Logistics Analytics</span>
					</div>
					<div className="flex gap-4">
						<Button
							variant="light"
							color="success"
							startContent={<LogIn size={18} />}
							onClick={() => navigate('/login')}
							className="text-white"
						>
							Login
						</Button>
						<Button
							color="success"
							variant="shadow"
							startContent={<UserPlus size={18} />}
							onClick={() => navigate('/register')}
							className="bg-[#00754F] text-white"
						>
							Register
						</Button>
					</div>
				</nav>

				<div className="max-w-7xl mx-auto px-8 py-20 text-center">
					<div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00754F]/20 border border-[#00754F]/30 rounded-full mb-8">
							<Sparkles size={16} className="text-[#6EC800]" />
							<span className="text-sm text-[#6EC800] font-medium">Intelligent Analytics Platform</span>
						</div>
						
						<h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
							Transform Your Offshore
							<br />
							Logistics Operations
						</h1>
						
						<p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
							Streamline your offshore operations with real-time data analytics, automated cost allocation, 
							and comprehensive performance tracking across all your facilities and vessels.
						</p>
						
						<div className="flex gap-6 justify-center">
							<Button
								size="lg"
								color="success"
								variant="shadow"
								endContent={<ArrowRight size={20} />}
								onClick={() => navigate('/register')}
								className="bg-[#00754F] text-white text-lg px-8 py-6"
							>
								Get Started
							</Button>
							<Button
								size="lg"
								variant="bordered"
								className="border-gray-600 text-white text-lg px-8 py-6"
								onClick={() => navigate('/login')}
							>
								View Demo Dashboard
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Live Stats Ticker */}
			<div className="bg-black/30 backdrop-blur-sm border-y border-gray-800 py-8">
				<div className="max-w-7xl mx-auto px-8">
					<div className="flex items-center justify-between">
						{stats.map((stat, index) => {
							const Icon = stat.icon
							return (
								<div 
									key={index}
									className={`flex items-center gap-4 transition-all duration-500 ${
										currentStat === index ? 'scale-110 opacity-100' : 'scale-100 opacity-60'
									}`}
								>
									<Icon size={24} className="text-[#6EC800]" />
									<div>
										<div className="text-3xl font-bold text-white">
											{stat.value}{stat.suffix}
										</div>
										<div className="text-sm text-gray-400">{stat.label}</div>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>

			{/* Dashboard Showcase */}
			<section className="py-20 px-8">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-white mb-4">
							Powerful Analytics Suite
						</h2>
						<p className="text-xl text-gray-400 max-w-3xl mx-auto">
							Five specialized dashboards designed for complete offshore logistics intelligence
						</p>
					</div>
					
					<div className="space-y-8">
						{dashboards.map((dashboard, index) => {
							const Icon = dashboard.icon
							return (
								<div 
									key={dashboard.id}
									className={`group relative bg-gradient-to-r ${dashboard.gradient} p-1 rounded-2xl transform transition-all duration-500 hover:scale-[1.02] ${
										isVisible ? 'translate-x-0 opacity-100' : index % 2 === 0 ? '-translate-x-20 opacity-0' : 'translate-x-20 opacity-0'
									}`}
									style={{ transitionDelay: `${index * 100}ms` }}
								>
									<div className="bg-gray-900 rounded-2xl p-8">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-4 mb-4">
													<div className={`w-14 h-14 bg-gradient-to-br ${dashboard.gradient} rounded-xl flex items-center justify-center`}>
														<Icon size={28} className="text-white" />
													</div>
													<h3 className="text-2xl font-bold text-white">{dashboard.title}</h3>
												</div>
												<p className="text-gray-400 mb-6 text-lg">{dashboard.description}</p>
												<div className="flex flex-wrap gap-4">
													{dashboard.features.map((feature, idx) => (
														<div key={idx} className="flex items-center gap-2">
															<CheckCircle size={16} className="text-[#6EC800]" />
															<span className="text-sm text-gray-300">{feature}</span>
														</div>
													))}
												</div>
											</div>
											<ChevronRight size={24} className="text-gray-600 group-hover:text-white transition-colors" />
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* Workflow Section */}
			<section className="py-20 px-8 bg-black/30">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-white mb-4">
							Simple, Powerful Workflow
						</h2>
						<p className="text-xl text-gray-400">
							From data upload to actionable insights in three easy steps
						</p>
					</div>
					
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{workflow.map((item) => {
							const Icon = item.icon
							return (
								<div key={item.step} className="relative">
									<div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center hover:border-[#00754F] transition-all duration-300">
										<div className="w-20 h-20 bg-gradient-to-br from-[#00754F] to-[#00A770] rounded-2xl flex items-center justify-center mx-auto mb-6">
											<Icon size={36} className="text-white" />
										</div>
										<div className="text-6xl font-bold text-[#00754F]/20 absolute top-4 right-4">
											{item.step}
										</div>
										<h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
										<p className="text-gray-400">{item.description}</p>
									</div>
									{item.step < 3 && (
										<div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
											<ArrowRight size={32} className="text-gray-600" />
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 px-8">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="text-4xl font-bold text-white mb-6">
						Ready to Transform Your Operations?
					</h2>
					<p className="text-xl text-gray-400 mb-8">
						Join industry leaders using BP Logistics Analytics to optimize offshore operations across multiple facilities.
					</p>
					<div className="flex gap-4 justify-center">
						<Button
							size="lg"
							color="success"
							variant="shadow"
							endContent={<ArrowRight size={20} />}
							onClick={() => navigate('/register')}
							className="bg-[#00754F] text-white"
						>
							Get Started
						</Button>
						<Button
							size="lg"
							variant="bordered"
							className="border-gray-600 text-white"
							onClick={() => navigate('/login')}
						>
							Login to Dashboard
						</Button>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-gray-800 py-12 px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col md:flex-row justify-between items-center gap-6">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-gradient-to-br from-[#00754F] to-[#00A770] rounded-lg flex items-center justify-center">
								<Ship size={24} className="text-white" />
							</div>
							<span className="text-xl font-bold text-white">BP Logistics Analytics</span>
						</div>
						<p className="text-gray-400 text-sm">
							© 2024 BP Solutions Dashboard. Intelligent analytics for offshore excellence.
						</p>
					</div>
				</div>
			</footer>
		</div>
	)
}

export default PublicLandingPage