## Provable's Proof-of-Identity Dapp + eWallet

### Dependencies

##### General

NodeJS v5+

Yarn or NPM

Truffle v2.1.1

##### Testing

TestRPC v3.0.3

Ethereum-bridge v0.4.9 (included under bridge folder)


### Install

Ensure the above dependencies are met and installed on your local system.

For deployment and testing, run install using your favoured node package manager in the root directory

`npm install`

### Truffle unit tests

Get an instance of testrpc running with the following parameters

`testrpc -m test -a 50`

Run ethereum-bridge with the following parameters

`node bridge -a 49 --dev --disable-price`

Finally, run the tests (note some of the sections will take several minutes to complete as they are waiting for callbacks to come in from Provable)

`truffle test`

### Network deployment using Truffle

The contracts can be conveniently deployed on a supported Provable network, simply by having an unlocked account running on your local ethereum node instance. When you have a node running with open rpc access, simply run

`truffle migrate --reset`

For automatic compilation and deployment to the current network

### Using ReactJS web-app

Yarn is the preferred and recommended package manager here, and the instructions will assume you're using that. NPM should work as well.

Change to one of the ui subdirectories

To run a local dev instance

`yarn start`

For production build

`yarn install`

`yarn build`

### Notes

Before deploying to a realnet, ensure you change the oraclizeLib.sol to set the network automatically. Comment out [L60](https://github.com/oraclize/dapp-proof-of-identity/blob/master/contracts/oraclizeLib.sol#L60) and Uncomment [L63](https://github.com/oraclize/dapp-proof-of-identity/blob/master/contracts/oraclizeLib.sol#L63). 

The WalletOracle and DigitalIdOracle contracts will need to be topped up with Ether as well, so the Provable calls can successfully be executed.
