module.exports = function (deployer) {

    deployer.deploy(DigitalIdConnector).then(function () {
        return deployer.deploy(oraclizeLib);
    }).then(function () {
        return deployer.deploy(idOracleLib);
    }).then(function () {
        return deployer.autolink(WalletOracle);
    }).then(function () {
        return deployer.link(oraclizeLib, [DigitalIdCostEstimator, DigitalIdOracle]);
    }).then(function () {
        return deployer.deploy(DigitalIdCostEstimator);
    }).then(function () {
        return DigitalIdConnector.deployed().updateCosterAddress(DigitalIdCostEstimator.address);
    }).then(function () {
        return deployer.deploy(DigitalIdDatabase, DigitalIdConnector.address);
    }).then(function () {
        return DigitalIdDatabase.deployed().addParent('0x7b6af255505cb8d97a088741aefaa22b3d5b5776', `0xb3e97c6c661eabfda5dc35ede44a934c3aa990a005d4a73cdcaf8652686661ffb247222a65bcd8bab5b5bf94aeec02246c6fae4accc5913846ae95deba8206c33e06ba914f7b0be0171aeefe0d1397b2d8d43afe9596b1d95409cb9883a4c9ca566b18ccf847d03d9b83c446e4c3de81dff7c6ebd65ba77b3dcba58487053963d222425f184e41a7354c627506ce375046426f87544b204dfdb627aafa1b716c134eeb9cc36c90d0b70e3b8b48250a178907d2b54654af4176209d15a6631c4ca48f08c81b3aa7cb1c9129ee186c9e81f40066f797921603011ed644614faad15508406840180bab3935e35a2d53b2c038da69cb190644239197317b5a6e9e75`);
    }).then(function() {
        return DigitalIdDatabase.deployed().addParent('0xb3ab88bc99d562a4852a08cdb41d723b83724751', `0xd281fad4d0f16dd5bd93c9cb035a8668be01eefc9da1dd84c29fd24c1641df012d20908b764a44b12f295df16246ac0356c80619bbbe43df6dae56f92c8ef28bbac8911a2fe4d7ed05d48d3d2539ac08583d086f6594203b045a1dae44cbe05a2c91e62ea6104bd850bd0b02632c2cfb156f3455292b4a460fae22c9ca9d32e065fe75aaddf2ee669a70061d15165b66e2786bff54b447d4d1269a855066c6af838afc3c1e6d0e4f8e1752e3480250dc260bb7cf438bc81fec7e4c2936686faedcca00cf422ba555aa8b0cc6fefc6b7ae3cf02481778509e61fe9f5cbb06cf85a2bec6456e9876a4c8c42eeeac96d9415df006ddf1afe37b7dd555e2732cd1fde4f976c07ecc5b16d6c1d5fb538d3ebfaace00f1087d9c9aeaa864d7c822af9bba86f7780f1e7be5e924a250afed6a1ab9a18208ef02173b9ba714e31fd07f1c1162121536125ffac2954e191085b27d5f1b8a937735f30ca6c0bd66a430f43c8189aa5b2c31e8ae2782336a015b80448634351de22726d21413f029907949b519b59e058b1ea8f84c417f7b40504b5c92d5cb6482ca8033ec1ab5a80e37fbe11c89b37ec817359d0b36668abc724f4c2b46c2c4331e524414cfa55e406a7af4898e42bb30e3aa93cf49ad750acc49b9e45c2b8b6a7e5d3e6dbce09f4799aaa2622ea3e8a2dc6763645270d015eb015653049be7c76b6891ea59c0158674e941`);
    }).then(function() {
        return deployer.deploy(DigitalIdInterface, DigitalIdConnector.address);
    }).then(function () {
        return DigitalIdConnector.deployed().updateDatabaseAddress(DigitalIdDatabase.address);
    }).then(function () {
        return DigitalIdConnector.deployed().updateInterfaceAddress(DigitalIdInterface.address);
    }).then(function () {
        return deployer.deploy(DigitalIdLogic, DigitalIdConnector.address);
    }).then(function () {
        return DigitalIdConnector.deployed().updateLogicAddress(DigitalIdLogic.address);
    }).then(function () {
        return deployer.deploy(DigitalIdOracle, DigitalIdConnector.address/*, { gas: 7000000 }*/);
    }).then(function () {
        return DigitalIdConnector.deployed().updateOracleAddress(DigitalIdOracle.address);
    }).then(function () {
        return deployer.deploy(WalletContainer, DigitalIdConnector.address/*, { gas: 7000000 }*/);
    }).then(function () {
        return deployer.deploy(WalletOracle, DigitalIdConnector.address, WalletContainer.address);
    }).then(function () {
        return DigitalIdConnector.deployed().updateWalletOracleAddress(WalletOracle.address);
    }).then(function () {
        return deployer.deploy(TestToken);
    });
};
