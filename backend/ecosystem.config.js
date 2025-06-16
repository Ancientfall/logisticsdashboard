module.exports = {
	apps: [{
		name: 'bp-logistics-backend',
		script: './src/server.js',
		instances: 'max',
		exec_mode: 'cluster',
		env: {
			NODE_ENV: 'production',
			PORT: 5000
		},
		error_file: './logs/pm2-error.log',
		out_file: './logs/pm2-out.log',
		log_file: './logs/pm2-combined.log',
		time: true,
		max_memory_restart: '500M',
		watch: false,
		ignore_watch: ['node_modules', 'logs', 'uploads'],
		max_restarts: 10,
		min_uptime: '10s',
		restart_delay: 4000,
		autorestart: true,
		cron_restart: '0 2 * * *', // Restart daily at 2 AM
		post_update: ['npm install'],
		merge_logs: true,
		log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
	}]
}