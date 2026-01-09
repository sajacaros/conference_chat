const BASE_PATH = '/home/sajacaros/workspace/conference/conference_chat';

module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: `${BASE_PATH}/backend`,
      script: `${BASE_PATH}/backend/gradlew`,
      args: 'bootRun --args="--spring.config.additional-location=file:../../secret.yml"',
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
      cwd: `${BASE_PATH}/frontend`,
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
