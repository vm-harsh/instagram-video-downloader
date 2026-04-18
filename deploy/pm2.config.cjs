module.exports = {
  apps: [
    {
      name: 'instadl-api',
      cwd: './server',
      script: 'src/index.js',
      exec_mode: 'cluster',
      instances: 'max',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'instadl-worker',
      cwd: './worker',
      script: 'src/index.js',
      instances: 2,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
