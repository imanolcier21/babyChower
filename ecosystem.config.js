module.exports = {
  apps: [{
    name: "babychower",
    script: "./server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};
