// Specific tests dependent on running testrpc with following parameters
// testrpc -m test -a 50
// specific as the address signature must match the used address
// and for the test, pre-signed values are used
import Promise from 'bluebird';
import CON from './misc/oraclizeConnectorABI.json';
import web3evm from '../web3evm.js';

web3 = web3evm.extend(web3);

let cleanState;

// acount in each test case needs to be different
contract('Digital Id Test - Failure cases', function (accounts) {
  before(async () => {
    cleanState = web3.evm.snapshot();
    const c = web3.eth.contract(CON).at('0xd77c23f268f5ceae3580d3e792e02d629a03178a');
    await c.deleteCoupon('free', { from: accounts[49] });
  });
  beforeEach(async () => {
    // add slight delay to avoid callbacks coming too fast
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  after(() => {
    web3.evm.revert(cleanState);
  });
  it('attempt EID linking with invalid cert - should throw', async function (done) {
    const itf = DigitalIdInterface.deployed();

    try {
      await itf.linkEID('0xDEADBEEF', '0x01', { from: accounts[10], value: web3.toWei(1, 'ether') });
      done();
    } catch (error) {
      assert.match(error, /^[Error: VM Exception while processing transaction: invalud JUMP]/, 'should throw due to invalid cert');
      done();
    }
  });
  it('attempt EID linking with insufficient funds - should throw', async function (done) {
    const itf = DigitalIdInterface.deployed();

    try {
      await itf.linkEID(CERT, SIG, { from: accounts[0], value: web3.toWei(0, 'ether') });
      done();
    } catch (error) {
      assert.match(error, /^[Error: VM Exception while processing transaction: invalud JUMP]/, 'should throw due to insufficient funds to cover costs');
      done();
    }
  });
  it('attempt EID linking with invalid sig - should achieve level 2 verification max', async function (done) {
    this.timeout(600000);
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();
    let linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    const invalidSig = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';


    await itf.linkEID(CERT, invalidSig, { from: accounts[0], value: web3.toWei(1, 'ether') });
    // certificate validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 2, 'should be at level 2 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');
    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // address sig as message validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 3, 'should be at level 3 verification');
    assert.equal(args.status, '0x03', 'should be 0x03 status, indicating failure');
    done();

  });
  it('attempt EID linking with valid sig, but unmatched sender - level 2 verification max', async function (done) {
    this.timeout(600000);
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();
    let linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[1] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));


    await itf.linkEID(CERT, SIG, { from: accounts[1], value: web3.toWei(1, 'ether') });
    // certificate validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 2, 'should be at level 2 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');
    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[1] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // address sig as message validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 3, 'should be at level 3 verification');
    assert.equal(args.status, '0x03', 'should be 0x03 status, indicating failure');
    done();


  });
});

contract('Digital Id Tests - Success cases', function (accounts) {
  it('attempt valid EID link that succeeds  - should achieve level 4 full verification', async function (done) {
    this.timeout(600000);
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();
    let linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));


    await itf.linkEID(CERT, SIG, { from: accounts[0], value: web3.toWei(1, 'ether') });
    // certificate validation
    var { args } = await linkWatcher.watchAsync();
    console.log(args);
    assert.equal(args.level.toNumber(), 2, 'should be at level 2 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');

    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // address sig as message validation
    var { args } = await linkWatcher.watchAsync();
    console.log(args);
    assert.equal(args.level.toNumber(), 3, 'should be at level 3 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');

    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // OCSP cert check
    var { args } = await linkWatcher.watchAsync();
    console.log(args);
    assert.equal(args.level.toNumber(), 4, 'should be at level 4 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');

    assert.isTrue(await db.isValidatedEID.call(accounts[0]), 'should be validated');
    done();

  });
  it('request OCSP recheck of existing EID - done by unassociated address', async function (done) {
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();
    let linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[0] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));


    await itf.requestOCSPCheck(accounts[0], { from: accounts[10], value: web3.toWei(0.1, 'ether') });

    // OCSP cert validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 4, 'should be at level 4 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');
    done();

  });
  it('revoke own address from EID', async function (done) {
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();

    assert.isTrue(await db.isValidatedEID.call(accounts[0]), 'should be validated');
    await itf.revokeOwnAddress({ from: accounts[0] });
    assert.isFalse(await db.isValidatedEID.call(accounts[0]), 'should be no longer validated');
    const validity = await db.eResidentValidity.call(accounts[0]);
    assert.isTrue(validity[1], 'should be true, indicating it has been revoked');
    assert.equal(validity[0].toNumber(), 10, 'should be code 10, to indicate user revokation');
    done();

  });
  it('attempt EID linking with SHA1 RSA cert - should achieve level 2 cert verification', async function (done) {
    this.timeout(900000);
    const itf = DigitalIdInterface.deployed();
    const db = DigitalIdDatabase.deployed();

    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });

    let linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[1] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));

    await itf.linkEID(CERTSHA1, '0xFF', { from: accounts[1], value: web3.toWei(1, 'ether') });
    // certificate validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 1, 'should be at level 1 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating success');
    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[1] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // address sig as message validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 2, 'should be at level 2 verification');
    assert.equal(args.status, '0x01', 'should be 0x01 status, indicating failure');
    linkWatcher = Promise.promisifyAll(db.linkingStatus({ linked: accounts[1] }, { fromBlock: blockNow() + 1, toBlock: 'pending' }));
    // needs to pass a block before listening
    web3.eth.sendTransaction({ from: accounts[10], to: 0 });
    // address sig as message validation
    var { args } = await linkWatcher.watchAsync();
    assert.equal(args.level.toNumber(), 3, 'should be at level 3 verification');
    assert.equal(args.status, '0x03', 'should be 0x03 status, indicating failure');
    done();

  });
});

const blockNow = () => {
  return web3.eth.blockNumber;
}
// SHA256 RSA
const CERT = `0x308204a030820388a00302010202102ba08efc4944b8cf56975c4a7693b7fb300d06092a864886f70d01010b05003064310b300906035504061302454531223020060355040a0c19415320536572746966697473656572696d69736b65736b75733117301506035504030c0e4553544549442d534b20323031313118301606092a864886f70d0109011609706b6940736b2e6565301e170d3136303131343038323835385a170d3139303131323231353935395a3081ad310b300906035504061302454531243022060355040a0c1b4553544549442028444947492d494420452d5245534944454e5429311a3018060355040b0c116469676974616c207369676e61747572653123302106035504030c1a42455254414e492c54484f4d41532c33393131313239303033313110300e06035504040c0742455254414e49310f300d060355042a0c0654484f4d4153311430120603550405130b333931313132393030333130820122300d06092a864886f70d01010105000382010f003082010a028201010097cc83dcc365e665d4ff98ee36c7a11f5b3721609bd7da33df26b7aa985d7af555273efd976a462fb4dccdd79e692c3cd635e990ded14f861c5143409e4d406fe09292896f23aa08f0632be94ec8f88ae0cf34e2786a6e4c133e3764cdcefa92f37f99cbb8891d7a188f4441eb9d64005b8c219baf8fb404b4c85288b77298976b17c5b6112db6033f1463f8770c21d4a05ce659c56547a75a4fada3f9687735f12e761a91a8d36d8126dd6edf58fb50507c08ff17e5e810b95b46b42e0a20ec4db5660e61f5176571f3d78be0fcd6deb6e14106a6b6dbc7b356f7a83b40fee7dd69236da24442cd13a832a6082aa7c930a7414fa244198ce3e5b50cb9d74c250203010001a38201023081ff30090603551d1304023000300e0603551d0f0101ff040403020640303c0603551d20043530333031060a2b06010401ce1f0102043023302106082b06010505070201161568747470733a2f2f7777772e736b2e65652f637073301d0603551d0e041604141d61762349445beb62ec94818e62fce088696f50302206082b06010505070103041630143008060604008e4601013008060604008e460104301f0603551d230418301680147b6af255505cb8d97a088741aefaa22b3d5b577630400603551d1f043930373035a033a031862f687474703a2f2f7777772e736b2e65652f7265706f7369746f72792f63726c732f657374656964323031312e63726c300d06092a864886f70d01010b0500038201010064e83fac6b03475a69b1d19bfe48fb0e7fe7bd9aa7122d09518587b2eb88942f30199b81519307139a5ab06ff9c63d92368900a90507c0a53e6e38cd72d994bd09dcf296830c141f812ddc7fa8d7c928fc01dca5a629338698b6373382ccf5f5196e12bb1626cb414d414e9ccf64b4074b8927ba7056724e7362472c35b6b5feed375f53073b9a2ddc93aeb6dd1afc745fcf2fb20c1edef674dd6c48e6edf5b87efad8fda5cc08c16ee7bc9b5c09b79bfbf3bee72035fd3c091d47a74ade35911ba6f087a0e2e60e497f72a8086c0966a0514a5b33bb7c2afbdc6a6e5c4e517887c771bc4a0fa492df88036b62323327200f61202ac5f97a5ac1f8bb584acbdb`;

// RSA sig for accoutns[0]
const SIG = `0x3d6aed49fc3d1bafb6994ce5247aefb86a6836153d30085d86201710572471245ea29cb13f41ea8e0e661c7b3ee8f7ded05852dd98ba9ad32239d1a315754552ccaf403883ced09c31b4a0382f4a4f0b5f71994b83e524c4e52a97495ec3589dd6c3cf2e1f9226c6828e31fe75f1016ebb271f1e2afb27a674e0c8fa31f490b064b3eaa4fdecdcf6c52fb123ef5b1bd73d6f8b63576648481cc595deb8c798dd371cab1e12f67143cec28c31e8e617bc36726f843fd4220f1e08ca79919e07c08d05343edea761ff6375a321705b7c93da22cb443b1884d708c08d2948581e3ba54ae3d44fee66d9af861cd33ca1670591459341f23e9d2fa56910f036559469`;

const CERTSHA1 = `0x308204e1308203c9a0030201020210456cfbf5fca20a0e502b56066239eba8300d06092a864886f70d01010505003064310b300906035504061302454531223020060355040a0c19415320536572746966697473656572696d69736b65736b75733117301506035504030c0e4553544549442d534b20323031313118301606092a864886f70d0109011609706b6940736b2e6565301e170d3132303831353037353535305a170d3137303831303230353935395a308199310b3009060355040613024545310f300d060355040a0c0645535445494431173015060355040b0c0e61757468656e7469636174696f6e3125302306035504030c1c424f4744414e4f56412c4a454c454e412c34383630353034323731363112301006035504040c09424f4744414e4f5641310f300d060355042a0c064a454c454e41311430120603550405130b343836303530343237313630820123300d06092a864886f70d010101050003820110003082010b0282010100e4edc4f5f2ab18383d3d77943621c96edaba46a21c8f566e9328195e5a906f5d1bdc071d390575a5ab324faeb8daebbcf60fab605ba7fecbb2feef593224c0367a4b104cd1e18c9c0c64b0100cb28d6d5b6f896bbfe5a8c58e12b2d55b90d868e9a0ed30b1d35f9f1d8ebe2e65b98bdc846b47a3412e55167bd73c7247467ce372d29e629ecfe778af7139e5e845956e10b43839a51333cb99cf83218b0f006833aa922452c4ce16f70e797028b901ebc9b2bed305c62f9a90c70782b8986f72327282016a7d44001e1abf3500090cd411789f0459761141bed66a093cc2a3426bdb26c200cd522ce9597fe0f6bd1059e9596006f2396f3d0402acca51e26f2d02040c81dbb3a38201563082015230090603551d1304023000300e0603551d0f0101ff0404030204b030510603551d20044a30483046060b2b06010401ce1f010103023037301206082b0601050507020230061a046e6f6e65302106082b060105050702011615687474703a2f2f7777772e736b2e65652f6370732f30240603551d11041d301b81196a656c656e612e626f6764616e6f76614065657374692e6565301d0603551d0e04160414863acde825bf6b8dab8af637afae0b05446ac2f530200603551d250101ff0416301406082b0601050507030206082b06010505070304301806082b06010505070103040c300a3008060604008e460101301f0603551d230418301680147b6af255505cb8d97a088741aefaa22b3d5b577630400603551d1f043930373035a033a031862f687474703a2f2f7777772e736b2e65652f7265706f7369746f72792f63726c732f657374656964323031312e63726c300d06092a864886f70d0101050500038201010039cefe706ca1e3c46844d9ef55543d15035dab6bb3ab31efb0e7c6a1cb99b99f426ba289b25b6a79ba650d9026e5cc03cfbd9d10b288f8ece860e9ba5295478ed04a76d33d95017feaaebdc2d90c47e65232ca3b381092770219e27763e0bd507afc4161db850641858058108230733b9975446b51484df31e3346760e2a921f967a57acbd11ae6bd9c81324ab802a8bb3b107843c7ddd159a58d25c7ed12899da9ca1fd29763c767663616385682a7a3dbb7afc97c829e883fa1c4d4a44f7125056d7d9470299d41197048377731388d6101c2e77e9005093b44f808f44962089727db72fca954505af9179f2bd1857ab92928f59a6b21e206533c882f40ae2`;

const SIG2 = `0x52f9b7c745a84caf787d2d190f4ebb5be00f0fd3eb60c6f00d38545ddd07efc20820b393a70da7fef7868bbcd590f2e8b0d01b08316d54332048845cbdaf9cb6991c2ee4037d0d905b436e702f791bae769c155f41872613fdcebc397333cbf538a20d4dc59f1fbab61b0ebdb61b36dbf29acc77cfd8924655896a962304e1c48d62f3e171446be4ecface492d12bbd9549c8815e5885877a1952c5905e9cbfcef9bf3bca0eb0e5fbc379e6c9ac219a46a2893f3853608c4edcca17885774c37aebf8ddbb67218c3526d505131bb6a81c8076d532bbe0fa749f690119a1b1af7789e1c1b0e07d4e1f533ae57aaa95b289409c9813d8ad0ba5a4a2226beea8885`;
