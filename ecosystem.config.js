module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: './gradlew',
      args: 'bootRun --args="--spring.config.additional-location=file:../secret.yml"',
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
      args: 'run preview',
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
