module.exports = {
  apps: [{
    name: 'medicare-backend',
    script: './server.js',
    instances: 2, // Số instance (hoặc 'max' để dùng tất cả CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    // Restart khi file thay đổi (chỉ trong development)
    ignore_watch: ['node_modules', 'logs', 'public/uploads']
  }]
};

