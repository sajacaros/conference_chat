const BASE_PATH = '/home/sajacaros/workspace/conference/conference_chat';

module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: `${BASE_PATH}/backend`,
      script: 'java',
      args: `-jar ${BASE_PATH}/backend/build/libs/backend-0.0.1-SNAPSHOT.jar --spring.config.additional-location=file:/home/sajacaros/workspace/conference/secret.yml`,
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
