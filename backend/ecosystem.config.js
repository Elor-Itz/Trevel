module.exports = {
  apps: [
    {
      name: "Trevel",
      script: "./dist/app.js",
      env: {
        NODE_ENV: "development",        
      },
      env_production: {
        NODE_ENV: "production",        
      },
      env_test: {
        NODE_ENV: "test",
      },
    },    
  ],
};