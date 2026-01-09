module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: './gradlew',
      args: 'bootRun',
      interpreter: '/bin/bash',
      watch: false,
      autorestart: true,
      max_restarts: 5,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
}
