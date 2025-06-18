module.exports = {
  apps: [{
    name: 'bp-logistics-dashboard',
    script: 'vps-server.js',
    cwd: '/var/www/logisticsdashboard',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    restart_delay: 1000,
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      TRUST_PROXY: 'true'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 10,
    min_uptime: '10s'
  }]
};