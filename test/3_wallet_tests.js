import Promise from 'bluebird';
import CON from './misc/oraclizeConnectorABI.json';
import web3evm from '../web3evm.js';

web3 = web3evm.extend(web3);

let cleanState;
contract('eWallet', function(accounts) {
  let w, o, db, c, t;
  before(async () => {
    cleanState = web3.evm.snapshot();
    w = WalletContainer.deployed();
    o = WalletOracle.deployed();
    db = DigitalIdDatabase.deployed();
    t = TestToken.deployed();
    c = web3.eth.contract(CON).at('0xd77c23f268f5ceae3580d3e792e02d629a03178a');
    await c.createCoupon('free', { from: accounts[49] });

    w.getBalance['uint40,address'] = async (serial, address) => await web3.toBigNumber(web3.eth.call({ data: w.contract.getBalance['uint40,address'].getData(serial, address), to: w.address}));
    // enable to log for testrpc deployment and testing UI
    /*console.log(DigitalIdConnector.deployed().address);
    console.log(w.address);*/
  });
  after(() => {
    web3.evm.revert(cleanState);
  });

  it('should receive ether to specific EID from address and account it', async done => {
    const receivedLogs = Promise.promisifyAll(w.LOG_receivedTransfer({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const balanceLogs = Promise.promisifyAll(w.LOG_balanceUpdate({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    await w.sendEtherToEID(39111290031, 'Welcome send', { value: 123456789, from: accounts[11] });

    const rArgs = (await receivedLogs.getAsync())[0].args;
    assert.equal(rArgs.receiverSerial.toNumber(), 39111290031);
    assert.equal(rArgs.senderSerial.toNumber(), 0);
    assert.equal(rArgs.senderAddress, accounts[11]);
    assert.equal(rArgs.token, '0x0000000000000000000000000000000000000000');
    assert.equal(rArgs.amount.toNumber(), 123456789);
    assert.equal(rArgs.note, 'Welcome send');

    // accounted balance check
    const bArgs = (await balanceLogs.getAsync())[0].args;
    assert.equal(bArgs.serial.toNumber(), 39111290031);
    assert.equal(bArgs.token, '0x0000000000000000000000000000000000000000');
    assert.equal(bArgs.amount.toNumber(), 123456789);

    assert.equal((await w.getBalance(39111290031)).valueOf(), 123456789);
    assert.equal((await w.getBalance['uint40,address'](39111290031, 0)).valueOf(), 123456789);
    assert.equal((await w.getBalance['uint40,address'](39111290031, '0x0000000000000000000000000000000000000000')).valueOf(), 123456789);

    done();
  });
  it('should receive tokens to specific EID from address and account it', async done => {
    await t.mint(accounts[2], 50000);
    await t.approve(w.address, 12345, { from: accounts[2] });
    const receivedLogs = Promise.promisifyAll(w.LOG_receivedTransfer({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const balanceLogs = Promise.promisifyAll(w.LOG_balanceUpdate({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    await w.sendTokensToEID(39111290031, t.address, 12345, 'ICO Share', { from: accounts[2] });

    const rArgs = (await receivedLogs.getAsync())[0].args;
    assert.equal(rArgs.receiverSerial.toNumber(), 39111290031);
    assert.equal(rArgs.senderSerial.toNumber(), 0);
    assert.equal(rArgs.senderAddress, accounts[2]);
    assert.equal(rArgs.token, t.address);
    assert.equal(rArgs.amount.toNumber(), 12345);
    assert.equal(rArgs.note, 'ICO Share');

    // accounted balance check
    const bArgs = (await balanceLogs.getAsync())[0].args;
    assert.equal(bArgs.serial.toNumber(), 39111290031);
    assert.equal(bArgs.token, t.address);
    assert.equal(bArgs.amount.toNumber(), 12345);

    //console.log(await w.getBalance['uint40,address'](39111290031, t.address).valueOf());
    assert.equal((await w.getBalance['uint40,address'](39111290031, t.address)).valueOf(), 12345);

    done();
  });

  it('should add certificate, validate, and transfer ether from eid to eid', async function (done) {
    this.timeout(600000);

    const senderInitBal = await w.getBalance(39111290031);
    const receive = Promise.promisifyAll(w.LOG_receivedTransfer({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const balance = Promise.promisifyAll(w.LOG_balanceUpdate({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    await w.transferEtherToSerial(CERT, SIG_NONCE0, 38508310088, 2222, 'SALARY', 0);

    var { args } = await receive.watchAsync();
    receive.stopWatching();
    assert.equal(args.receiverSerial.toNumber(), 38508310088);
    assert.equal(args.senderSerial.toNumber(), 39111290031);
    assert.equal(args.senderAddress, '0x0000000000000000000000000000000000000000');
    assert.equal(args.token, 0);
    assert.equal(args.amount.toNumber(), 2222);
    assert.equal(args.note, 'SALARY');


    const balanceList = await balance.getAsync();

    var { args } = balanceList[0]; // sender balance log update
    const expectedSenderBal = senderInitBal.minus(2222).valueOf();
    assert.equal(args.serial.toNumber(), 39111290031);
    assert.equal(args.token, '0x0000000000000000000000000000000000000000');
    assert.equal(args.amount, expectedSenderBal);

    var { args } = balanceList[1]; // sender balance log update
    assert.equal(args.serial.toNumber(), 38508310088);
    assert.equal(args.token, '0x0000000000000000000000000000000000000000');
    assert.equal(args.amount, 2222);

    assert.equal((await w.getBalance(39111290031)).valueOf(), expectedSenderBal);
    assert.equal((await w.getBalance['uint40,address'](39111290031, 0)).valueOf(), expectedSenderBal);
    assert.equal((await w.getBalance['uint40,address'](39111290031, '0x0000000000000000000000000000000000000000')).valueOf(), expectedSenderBal);

    assert.equal((await w.getBalance(38508310088)).valueOf(), 2222);
    assert.equal((await w.getBalance['uint40,address'](38508310088, 0)).valueOf(), 2222);
    assert.equal((await w.getBalance['uint40,address'](38508310088, '0x0000000000000000000000000000000000000000')).valueOf(), 2222);

    done();
  });
/*

// can't transfer token as token addresses change
  it('should transfer tst tokens from eid to eid', async function (done) {
    this.timeout(600000);

    const senderInitBal = await w.getBalance(39111290031, '0x4156ff3542b267cd1620d2cfe1b925ddec2ecc84');
    const receive = Promise.promisifyAll(w.LOG_receivedTransfer({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const balance = Promise.promisifyAll(w.LOG_balanceUpdate({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    //console.log((await db.getCrtTxNonce(web3.sha3(CERT, {encoding: 'hex'}))).valueOf());
    transferTokenToSerial(bytes _crt, bytes _signed, address _signedToken, uint40 _signedReceiverSerial, uint _signedValue, string _signedMessage, uint _signedNonce)
    await w.transferTokenToSerial(CERT, SIG_NONCE1, t.address, 38508310088, 2222, 'TOKEN DEPOSIT', 1);

    var { args } = await receive.watchAsync();
    receive.stopWatching();
    assert.equal(args.receiverSerial.toNumber(), 38508310088);
    assert.equal(args.senderSerial.toNumber(), 39111290031);
    assert.equal(args.senderAddress, '0x0000000000000000000000000000000000000000');
    assert.equal(args.token, t.address);
    assert.equal(args.amount.toNumber(), 2222);
    assert.equal(args.note, 'TOKEN DEPOSIT');


    const balanceList = await balance.getAsync();
    var { args } = balanceList[0]; // sender balance log update
    const expectedSenderBal = senderInitBal.minus(2222).valueOf();
    assert.equal(args.serial.toNumber(), 39111290031);
    assert.equal(args.token, t.address);
    assert.equal(args.amount, expectedSenderBal);

    var { args } = balanceList[1]; // sender balance log update
    assert.equal(args.serial.toNumber(), 38508310088);
    assert.equal(args.token, t.address);
    assert.equal(args.amount, 2222);

    assert.equal((await w.getBalance['uint40,address'](39111290031, t.address)).valueOf(), expectedSenderBal);

    assert.equal((await w.getBalance['uint40,address'](38508310088, t.address)).valueOf(), 2222);

    done();
  });

  it('should transfer ether from eid to address', async function (done) {
    this.timeout(600000);

    const senderInitBal = await w.getBalance(39111290031);
    const receive = Promise.promisifyAll(w.LOG_receivedTransfer({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const balance = Promise.promisifyAll(w.LOG_balanceUpdate({}, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    await w.transferTokenToAddress(CERT, SIG_NONCE2, '0x4156ff3542b267cd1620d2cfe1b925ddec2ecc84', '0x00b6c4d58d6def12eba7cfeaeca65a06cdca6505', 3333, 'GIFT', 2);

    var { args } = await receive.watchAsync();
    receive.stopWatching();
    assert.equal(args.receiverAddress, '0x00b6c4d58d6def12eba7cfeaeca65a06cdca6505');
    assert.equal(args.senderSerial.toNumber(), 39111290031);
    assert.equal(args.senderAddress, '0x0000000000000000000000000000000000000000');
    assert.equal(args.token, '0x0000000000000000000000000000000000000000'.toLowerCase());
    assert.equal(args.amount.toNumber(), 3333);
    assert.equal(args.note, 'GIFT');


    const balanceList = await balance.getAsync();
    var { args } = balanceList[0]; // sender balance log update
    const expectedSenderBal = senderInitBal.minus(3333).valueOf();
    assert.equal(args.serial.toNumber(), 39111290031);
    assert.equal(args.token, '0x0000000000000000000000000000000000000000');
    assert.equal(args.amount, expectedSenderBal);

    var { args } = balanceList[1]; // sender balance log update
    assert.equal(args.serial.toNumber(), 38508310088);
    assert.equal(args.token, '0x0000000000000000000000000000000000000000');
    assert.equal(args.amount, 3333);

    assert.equal((await w.getBalance(39111290031)).valueOf(), expectedSenderBal);
    assert.equal((await w.getBalance['uint40,address'](39111290031, 0)).valueOf(), expectedSenderBal);
    assert.equal((await w.getBalance['uint40,address'](39111290031, '0x0000000000000000000000000000000000000000')).valueOf(), expectedSenderBal);

    done();
  });
*/
});

const blockNow = () => {
  return web3.eth.blockNumber;
}

const CERT = `0x308204a030820388a00302010202102ba08efc4944b8cf56975c4a7693b7fb300d06092a864886f70d01010b05003064310b300906035504061302454531223020060355040a0c19415320536572746966697473656572696d69736b65736b75733117301506035504030c0e4553544549442d534b20323031313118301606092a864886f70d0109011609706b6940736b2e6565301e170d3136303131343038323835385a170d3139303131323231353935395a3081ad310b300906035504061302454531243022060355040a0c1b4553544549442028444947492d494420452d5245534944454e5429311a3018060355040b0c116469676974616c207369676e61747572653123302106035504030c1a42455254414e492c54484f4d41532c33393131313239303033313110300e06035504040c0742455254414e49310f300d060355042a0c0654484f4d4153311430120603550405130b333931313132393030333130820122300d06092a864886f70d01010105000382010f003082010a028201010097cc83dcc365e665d4ff98ee36c7a11f5b3721609bd7da33df26b7aa985d7af555273efd976a462fb4dccdd79e692c3cd635e990ded14f861c5143409e4d406fe09292896f23aa08f0632be94ec8f88ae0cf34e2786a6e4c133e3764cdcefa92f37f99cbb8891d7a188f4441eb9d64005b8c219baf8fb404b4c85288b77298976b17c5b6112db6033f1463f8770c21d4a05ce659c56547a75a4fada3f9687735f12e761a91a8d36d8126dd6edf58fb50507c08ff17e5e810b95b46b42e0a20ec4db5660e61f5176571f3d78be0fcd6deb6e14106a6b6dbc7b356f7a83b40fee7dd69236da24442cd13a832a6082aa7c930a7414fa244198ce3e5b50cb9d74c250203010001a38201023081ff30090603551d1304023000300e0603551d0f0101ff040403020640303c0603551d20043530333031060a2b06010401ce1f0102043023302106082b06010505070201161568747470733a2f2f7777772e736b2e65652f637073301d0603551d0e041604141d61762349445beb62ec94818e62fce088696f50302206082b06010505070103041630143008060604008e4601013008060604008e460104301f0603551d230418301680147b6af255505cb8d97a088741aefaa22b3d5b577630400603551d1f043930373035a033a031862f687474703a2f2f7777772e736b2e65652f7265706f7369746f72792f63726c732f657374656964323031312e63726c300d06092a864886f70d01010b0500038201010064e83fac6b03475a69b1d19bfe48fb0e7fe7bd9aa7122d09518587b2eb88942f30199b81519307139a5ab06ff9c63d92368900a90507c0a53e6e38cd72d994bd09dcf296830c141f812ddc7fa8d7c928fc01dca5a629338698b6373382ccf5f5196e12bb1626cb414d414e9ccf64b4074b8927ba7056724e7362472c35b6b5feed375f53073b9a2ddc93aeb6dd1afc745fcf2fb20c1edef674dd6c48e6edf5b87efad8fda5cc08c16ee7bc9b5c09b79bfbf3bee72035fd3c091d47a74ade35911ba6f087a0e2e60e497f72a8086c0966a0514a5b33bb7c2afbdc6a6e5c4e517887c771bc4a0fa492df88036b62323327200f61202ac5f97a5ac1f8bb584acbdb`;

const SIG_NONCE0 = `0x5572fbab5664a095cc591d814955b7f696eeb77a204ec8946f0e8b265c4eeca4caa94ca77245c35c57020caf8ad738015178d6e99a8fc3f7ca2f3fc2348f962a06e00e01c04ac8619349ba0b0f0de58ea2635f6aedb1fe35a28ca3a64aa809e75bf51105c8ae9ef32d2128bd9690dce64d6a5c75d84041b7df37c1da6b6302625b1f2a6b7e2666fc9027f54f32927eae0120b16f5694354c43a831bbe7e70827cb65945c30947d8ced14f235e636bc53d198b51a8abe9d84b6f11528dc008e6564a1c4ac4ebccf22cfc5812302eab4080486e5f2ce9d821c36cb97fd6610964591ce7bd6abfed83c9fe91f5165f7f8238cb7e68e75d740a1d5b4ce9b92023e27`;
/*
const SIG_NONCE1 = `0x0742e59c2f60486a0d7911d197bf66f1d80a0ec0b0bed8ae83afb8edaaa189063a75086117be4d835fcd1435b1b8032f3e420e062d32edaaa6c29f4d6557984a1d3f72292ec73a180b83ff0aac1c9af0fc761f9c7ded374ff0e54548136b1dd97f1ff2471659cfcffe5ab50d61336746dabb7725885199a6a7ee5714152f2fc888544d427a5b99bb423ea8437f1ba22ed0ee6b63c583f9512ec7a0237085ffbe119493b20da61c3457e5a40d0d5f02d8c3ea8d5ce4ba3e7a6de8f32c0e215b69fa9073cb7621d46698b976fafadb3da2793bfafec8625e0bf88e9d07db31695bdc6049b9c986bd3dfc30b7c7f0812dffe81393480eab26768d99765b00073257`;

const SIG_NONCE2 = `0x0352e443146434fa8168ee19b3ad37f908f767362173c41d87d40e0ded7a179a5dc423b7f178158e41a2ec17b1c7dd1d9da5f4a1e57f074a63745bede4559f1c28f311cb99f0e277c6c3750b57472a4adef277bc086b924c9d9344ca5dc9366ff5c1fb5a20a285201721b436073ad224a88838fb53b71e7ec9b1cf8463163d9d9bcf24c43d821dc326e32bea378cf6fdb3bed77c8947fd7490455f0431d7e92fa1436049b358f885a982c2ff1dffddec6398e4a67d2a6386298329d428c6e84d934d20b549118d8ac077d6f838d486408141325ad9a163c9956250ef56fb71d0370ce33d1ec769a900203b77377355a6a138713da1d228a77eafd8e647da4cf6`;
*/
