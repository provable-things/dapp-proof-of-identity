// General tests can be run under any network
import CON from './misc/oraclizeConnectorABI.json';

contract('General Digital Id Tests', function(accounts) {
  before(async () => {
    const c = web3.eth.contract(CON).at('0xd77c23f268f5ceae3580d3e792e02d629a03178a');
    await c.deleteCoupon('free', { from: accounts[49] });
  });
  it("connector should have all subcontract connections in place", async function(done) {
    const conn = DigitalIdConnector.deployed();

    const addressRegex = /^(0x)([A-Fa-f0-9]{2}){20}$/;
    assert.match(await conn.database_.call(), addressRegex, 'db should be a 20 byte hex address');
    assert.match(await conn.logic_.call(), addressRegex, 'logic should be a 20 byte hex address');
    assert.match(await conn.oracle_.call(), addressRegex, 'oracle should be a 20 byte hex address');
    assert.match(await conn.interface_.call(), addressRegex, 'interface should be a 20 byte hex address');
    assert.match(await conn.coster_.call(), addressRegex, 'coster should be a 20 byte hex address');
    assert.match(await conn.walletOracle_.call(), addressRegex, 'wallet oracle should be a 20 byte hex address');
    done();
  });
  it("coster should return valid costs upon deployment", async function(done) {
    const coster = DigitalIdCostEstimator.deployed();

    const checkValidCost = (cost, stage, higherCost) => {
      const costConvert = cost.toNumber();
      // ensure cost is non-zero
      assert.isAbove(costConvert, 0, stage + ' should be above 0');
      // ensure cost is within normal range
      assert.isBelow(costConvert, web3.toWei(1, 'ether'), stage + 'should be below 1 ether');

      // compare with cost that includes extra proccesses, which should be higher
      if (higherCost)
        assert.isBelow(costConvert, higherCost, 'should be below higher cost');
    };

    // estimated process request costs
    const newLinkwSHA1 = await coster.expectedOracleCosts.call(true);
    checkValidCost(newLinkwSHA1, 'newLinkSHA1');
    const newLink = await coster.expectedOracleCosts.call(false);
    checkValidCost(newLink, 'newLink' , newLinkwSHA1);
    const OCSPCosts = await coster.expectedOCSPCosts.call();
    checkValidCost(OCSPCosts, 'OCSPCosts', newLink);
    // estimated singular query costs for retries
    const SHA1Cost = await coster.getRequestCost.call(0);
    checkValidCost(SHA1Cost, 'SHA1Cost');
    const RSACrtSigCost = await coster.getRequestCost.call(1);
    checkValidCost(RSACrtSigCost, 'RSACrtSig');
    const RSAAdrSigCost = await coster.getRequestCost.call(2);
    checkValidCost(RSAAdrSigCost, 'RSAAddrSig');
    const OCSPAPICost = await coster.getRequestCost.call(3);
    checkValidCost(OCSPAPICost, 'OCSPAPI');
    const OCSPCrtSigCost = await coster.getRequestCost.call(4);
    checkValidCost(OCSPCrtSigCost, 'OCSPCrtSig');
    done();
  });
});
