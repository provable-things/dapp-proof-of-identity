module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": [
      "javascripts/app.js"
    ],
    "app.css": [
      "stylesheets/app.css"
    ],
    "images/": "images/"
  },
  rpc: {
    host: "localhost",
    port: 8545,
    gas: 4700000,
    gasPrice: 1000000000
  },
  networks: {
    "main": {
      network_id: 1,
      gas: 6000000
    },
    "kovan": {
      network_id: 42,
      gas: 4700000
    }
  },
  mocha: {
    bail: false
  }
};
