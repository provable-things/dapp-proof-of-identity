// TODO do event searches starting from wallet's birth block
import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import Snackbar from 'material-ui/Snackbar';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import {GridTile} from 'material-ui/GridList';
import {List, ListItem} from 'material-ui/List';
import Chip from 'material-ui/Chip';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import FontIcon from 'material-ui/FontIcon';
import Avatar from 'material-ui/Avatar';
import Paper from 'material-ui/Paper';
import CircularProgress from 'material-ui/CircularProgress';
import Dialog from 'material-ui/Dialog';
import Toggle from 'material-ui/Toggle';
import SvgIcon from 'material-ui/SvgIcon';
import erc20ABI from '../json/erc20infoABI.json';
import * as web3Methods from './Web3Methods';
import { Notify } from './Notification';
import createHash from 'create-hash';
import web3 from './Web3';
import etherPic from '../img/eth.png';
import Promise from 'bluebird';
import * as asn1Finder from './asn1Finder';
import Blockies from './Blockies';
import { CONTRACT_WALLET } from './Constant';

let hwcrypto;

const CircularLoading = (props) => (
  <div>
    <CircularProgress size={props.size} thickness={props.weight} />
  </div>
);

const sendIcon = <FontIcon className='material-icons'>send</FontIcon>;
const etherCoinIcon =
<SvgIcon >
  <path style={{transform: 'scale(0.1058)'}} d="M113.313,0C50.732,0,0,50.732,0,113.313s50.732,113.313,113.313,113.313s113.313-50.732,113.313-113.313
  	S175.894,0,113.313,0z M111.844,188.386l-44.78-63.344l44.78,26.218V188.386z M111.844,141.976l-45.083-26.408l45.083-19.748
  	V141.976z M111.844,92.647l-43.631,19.11l43.631-73.306V92.647z M114.75,38.429l44.244,73.6L114.75,92.647V38.429z M114.75,188.386
  	V151.26l44.78-26.218L114.75,188.386z M114.75,141.977V95.821l45.116,19.762L114.75,141.977z"/>
</SvgIcon>;
const tokenIcon = <FontIcon className='material-icons'>monetization_on</FontIcon>;

const WalletCard = (props) => (
  <Card>
    <CardHeader
      title={props.state.name}
      subtitle={`EID: ${props.state.eid}`}
      actAsExpander={true}
      showExpandableButton={false}
      style={{cursor: 'auto'}}
    />
    <CardActions>
      <RaisedButton
        label='Transfer'
        primary={true}
        labelPosition='before'
        style={{marginLeft: 8}}
        icon={sendIcon}
        disabled={props.state.initLoading}
        onTouchTap={() => props.handleTransfer()}
        />
        <RaisedButton
          label='Top up token'
          labelPosition='before'
          style={{marginLeft: 8, float: 'right'}}
          icon={tokenIcon}
          disabled={props.state.initLoading}
          onTouchTap={() => props.handleTokenTopup()}
          />
        <RaisedButton
          label='Top up ether'
          labelPosition='before'
          style={{marginLeft: 8, float: 'right'}}
          icon={etherCoinIcon}
          disabled={props.state.initLoading}
          onTouchTap={() => props.handleEtherTopup()}
          />
    </CardActions>
    <CardText>
      <Divider/>
      <List>
        <ChipArray balance={props.state.balance} selectToken={props.selectToken}/>
      </List>
    </CardText>
  </Card>
);

const ListElement = (props) => {
  let divider = null;
  if (!props.first)
    divider = <Divider />;

  const SHA256 = createHash('sha256');
  const propsConcat = Object.keys(props).reduce((result, key) => {
    if (key === 'first')
      return result;

    return result.concat(props[key]);
  }, []);

  const key = SHA256.update(propsConcat.toString()).digest('hex');

  const isEther = props.token === '0x0000000000000000000000000000000000000000';
  const tokenEtherscan = `https://kovan.etherscan.io/token/${props.token}`;
  const isTokenValid = props.tokenInfo[props.token].name !== 'Token';
  const tokenSymbol = isTokenValid ? props.tokenInfo[props.token].symbol : 'tokens';
  const formattedToken = isEther ? tokenSymbol : <a href={tokenEtherscan} target='_blank'>{tokenSymbol}</a>;
  const tokenDecimals = props.tokenInfo[props.token].decimals;
  const formattedAmount = isEther ? web3.fromWei(props.amount, 'ether') : web3.toBigNumber(props.amount).div(Math.pow(10, tokenDecimals)).toFixed();

  const transactionInfo = props.event === 'LOG_receivedTransfer' ? <div>Received {formattedAmount} {formattedToken} from {props.senderSerial === '0' ? 'address ' + props.senderAddress : 'EID ' + props.senderSerial} </div> : <div>Sent {formattedAmount} {formattedToken} to {props.receiverSerial === '0' ? 'address ' + props.receiverAddress : 'EID ' + props.receiverSerial} </div> ;

  const list =
    <ListItem key={key}
      primaryText={transactionInfo}
      secondaryText={
          <div>
            Note: {props.note}
            <br></br>
            {new Date(props.time * 1000).toLocaleString()}
          </div>
      }
      secondaryTextLines={2}
      style={{lineHeight: '20px'}}
      disabled={true}
    />;

  return([divider, list]);
}

export default class MyWallet extends React.Component {

  state = {
    snackbarMsg: '',
    showSnackbar: false,
    con: null,
    db: null,
    wlt: null,
    extractedCrt: null,
    crtId: null,
    initLoading: true,
    eid: 'Unknown',
    name: 'Loading...',
    sentList: [],
    sentLoading: true,
    receivedList: [],
    receivedLoading: true,
    balance: {},
    selectedToken: null,
    walletBirthBlock: null,
    unmounted: false
  };

  _isMounted;

  async componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    this._isMounted = true;
    await this.initHwcrypto();

    if (!this.state.extractedCrt)
      return;
    //NOCARDTEST
    //await this.setState({extractedCrt: true});

    const instancePromises = {
      con: web3Methods.getInstance('con'),
      db: web3Methods.getInstance('db'),
      wlt: web3Methods.getInstance('wlt')
    };
    const { con, db, wlt } = await Promise.props(instancePromises);

    const walletBirthBlock = (await wlt.birthBlock_Async()).valueOf();

    this.setState({ con, db, wlt, walletBirthBlock });

    await this.loadUserFromCard();

    //await new Promise(resolve => setTimeout(resolve, 1000));
    // txFilter started from within balance
    await this.getBalance();

  }

  async loadUserFromCard() {
    const { db, extractedCrt } = this.state;

    // NOCARDTEST
    const crtId = web3.sha3(extractedCrt.hex, {encoding: 'hex'});
    //const crtId = web3.sha3(CRT, {encoding: 'hex'});
    const crtBuffer = Buffer.from(extractedCrt.hex, 'hex');
    //const crtBuffer = Buffer.from(CRT.substr(2), 'hex');

    let eid, crtResult, cn, name;

    // reading details directly from card for now
    // should be helpful with node traffic/bandwith
    // and local info > remote info
    crtResult = asn1Finder.findStringByOID(crtBuffer, '2.5.4.3', 2);
    cn = crtResult.split(',');
    name = `${cn[1]} ${cn[0]}`;
    eid = cn[2];

    await this.setState({ eid, name, crtId, initLoading: false });
  }

  async initHwcrypto() {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      hwcrypto = window.hwcrypto;
      const debug = await hwcrypto.debug();
      if (debug === 'hwcrypto.js @@hwcryptoversion with failing backend No implementation')
        throw new Error('no_card');

      await hwcrypto.use('auto');
      await this.setState({ extractedCrt: await hwcrypto.getCertificate({lang: 'en'}) });
    } catch (e) {
      if (e.message === 'no_implementation' || e.message === 'no_certificates' || e.message === 'no_card') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!this._isMounted)
          return;

        console.log('retrying to find eid: ' + e.message);
        await this.initHwcrypto();
        return;
      }
      this.pushNotification('Digi-ID card error', 'There was an error attempting to load your card. Check console output for the error details. To retry, please refresh the page.', 'error');
      console.log(e);
    }
  }

  async getBalance() {
    const { eid, balance, wlt, walletBirthBlock } = this.state;

    const balanceEvent = wlt.LOG_balanceUpdate({serial: eid}, { fromBlock: walletBirthBlock });
    await balanceEvent.get(await (async (error, result) => {

      for(let i = 0; i < result.length; i++) {
        const { args } = result[i];

        balance[args.token] = { amount: args.amount.valueOf(), time: args.time.valueOf() };

      }

      Object.keys(balance).map(token => {
        //console.log(balance);
        balance[token].address = token;
        if (token === '0x0000000000000000000000000000000000000000') {
          balance[token].name = 'Ether';
          balance[token].decimals = 18;
          balance[token].symbol = 'ETH';
        }
        else {

          balance[token].name = 'Token';
          balance[token].decimals = 0;
          balance[token].symbol = 'TKN @ ' + token;
          (async token => {
            try {
              let tokenCtr = Promise.promisifyAll(web3.eth.contract(erc20ABI).at(token));

              // TODO add some sort of fallback here
              const [n, d, s] = await Promise.all([
                    tokenCtr.nameAsync(),
                    tokenCtr.decimalsAsync(),
                    tokenCtr.symbolAsync()
                ]);

              balance[token].name = n;
              balance[token].decimals = d.toNumber();
              balance[token].symbol = s;
            } catch (e) {
              balance[token].name = 'Token';
              balance[token].decimals = 0;
              balance[token].symbol = 'TKN @ ' + token;
              console.log('Failed retrieving token info for ' + token);
              console.log(e);
            }
            await this.setState({balance});

          })(token);
        }
      });
      //await Promise.all(balancePromises);

      await this.setState({balance});
      this.startTxFilter();

      // watch balance for continual updates
      balanceEvent.watch(async (error, result) => {
        const { args } = result;

        const { token } = args;
        // update balance if token already exists
        if (balance[token]) {
          balance[token].amount = args.amount.valueOf();
          balance[token].time = args.time.valueOf();
        }


        if (!balance[token]) {
          balance[token] = { address: token, amount: args.amount.valueOf(), time: args.time.valueOf() };
          if (token === '0x0000000000000000000000000000000000000000') {
            balance[token].name = 'Ether';
            balance[token].decimals = 18;
            balance[token].symbol = 'ETH';
          }
          else {
            try {
              let tokenCtr = Promise.promisifyAll(web3.eth.contract(erc20ABI).at(token));
              const [n, d, s] = await Promise.all([
                    tokenCtr.nameAsync(),
                    tokenCtr.decimalsAsync(),
                    tokenCtr.symbolAsync()
                ]);
              balance[token].name = n;
              balance[token].decimals = d.toNumber();
              balance[token].symbol = s;
              /*balance[token].name = await tokenCtr.nameAsync();
              balance[token].decimals = await tokenCtr.decimalsAsync();
              balance[token].symbol = await tokenCtr.symbolAsync();*/
            } catch (e) {
              balance[token].name = 'Token';
              balance[token].decimals = 0;
              balance[token].symbol = 'TKN @ ' + token;
              console.log('Failed retrieving token info for ' + token);
              console.log(e);
            }
          }
        }
        await this.setState({balance});
      });
    }));
  }

  async startTxFilter() {
    const { wlt, eid, walletBirthBlock } = this.state;
    wlt.LOG_sentTransfer({ senderSerial: eid }, { fromBlock: walletBirthBlock, toBlock: 'pending' }, (error, result) => {
      const { event, args } = result;

      let { sentList } = this.state;

      const {
        amount,
        note,
        receiverSerial,
        receiverAddress,
        senderAddress,
        senderSerial,
        time,
        token } = args;

      sentList.unshift(
        {
          amount: amount.valueOf(),
          note,
          receiverSerial: receiverSerial.valueOf(),
          receiverAddress,
          senderAddress,
          senderSerial: senderSerial.valueOf(),
          time: time.valueOf(),
          token,
          event: event
        }
      );

      this.setState({ sentList, sentLoading: false });

    });
    wlt.LOG_receivedTransfer({ receiverSerial: eid }, { fromBlock: walletBirthBlock, toBlock: 'pending' }, (error, result) => {
      const { event, args } = result;

      let { receivedList } = this.state;

      const {
        amount,
        note,
        receiverSerial,
        receiverAddress,
        senderAddress,
        senderSerial,
        time,
        token } = args;

      receivedList.unshift(
        {
          amount: amount.valueOf(),
          note,
          receiverSerial: receiverSerial.valueOf(),
          receiverAddress,
          senderAddress,
          senderSerial: senderSerial.valueOf(),
          time: time.valueOf(),
          token,
          event: event
        }
      );

      this.setState({ receivedList, receivedLoading: false });

    });
  }

  pushNotification(title, message, level, tx, key) {
    const nextNotification = <Notify
      key={ key || this.props.notificationIndex() }
      title={ title }
      message={ message }
      level={ level }
      autoDismiss={ 0 }
      dismissible={ true }
      action={tx ? { label: 'Check Tx', callback: () => window.open('https://kovan.etherscan.io/tx/' + tx, '_blank') } : null}
    />;
    this.props.addMainNotification(nextNotification);
  }

  async selectToken(selectedToken) {

    await this.setState({ selectedToken });
    this.refs.transferPopup.setTokenInfo(this.state.balance[selectedToken]);
  };

  async handleTransferButton() {
    const { selectedToken } = this.state;
    if (selectedToken === null)
      this.refs.alertPopup.handleOpen();
    else
      this.refs.transferPopup.handleOpen();

  };

  async broadcastTokenTransfer(opt) {
    const { db, wlt, crtId } = this.state;

    let transferFnc;
    if (opt.isEID)
      transferFnc = wlt.transferTokenToSerialAsync;
    else
      transferFnc = wlt.transferTokenToAddressAsync;

    const currentNonce = (await web3Methods.callGetTxNonce(crtId)).valueOf();

    console.log('receiver: ' + opt.receiver);
    console.log('token: ' + opt.tokenAddress);
    console.log('amount: ' + opt.amount);
    console.log('note: ' + opt.note);
    console.log('nonce: ' + currentNonce);

    const hasher = web3Methods.isAddress(opt.receiver) ?
      Promise.promisify(wlt.getHashForTransfer['address,address,uint256,string,uint256']) :
      Promise.promisify(wlt.getHashForTransfer['uint40,address,uint256,string,uint256']);
    // FOR DEBUGGING
    const msgHash = await hasher(opt.receiver, opt.tokenAddress, opt.amount, opt.note, currentNonce);
    console.log('msgHash');
    console.log(msgHash);

    const { crt, sig } = await this.hwcryptoCrtAndSig(msgHash);

    console.log('HWCRYPTO VARS PRE-BROADCAST');
    console.log('NONCE: ' + currentNonce);
    console.log(crt);
    console.log(sig);
    //function transferTokenToSerial(bytes _crt, bytes _signed, address _signedToken, uint40 _signedReceiverSerial, uint _signedValue, string _signedMessage, uint _signedNonce)
    this.setState({snackbarMsg: 'Transaction being broadcast to ethereum network...', showSnackbar: true});
    web3.eth.defaultAccount = web3.eth.defaultAccount || web3.eth.accounts[0];
    try {
      const tx = await transferFnc('0x' + crt, '0x' + sig, opt.tokenAddress, opt.receiver, opt.amount, opt.note, currentNonce, { gas: 4000000 });
      this.pushNotification('Transfer', `Transaction receipt: ${tx} \nWait a few minutes for it to fully execute its on-chain and off-chain processing...`, 'success', tx);
    } catch (e) {
      this.pushNotification('Transfer failed', `An error occurred while trying to broadcast...`, 'error');
      console.log(e);
    }
  };

  async hwcryptoCrtAndSig(msgHash) {
    const { extractedCrt } = this.state;
    const hashBuffer = Buffer.from(msgHash.substr(2), 'hex');
    const msgHashUint8Array = new Uint8Array(hashBuffer);
    const signedMsg = await hwcrypto.sign(extractedCrt, {type: 'SHA-256', value: msgHashUint8Array}, {lang: 'en'});
    return { crt: extractedCrt.hex, sig: signedMsg.hex };
  };

  async handleEtherTopup() {

    this.refs.etherPopup.handleOpen();
  };

  async handleTokenTopup() {

    this.refs.tokenPopup.handleOpen();
  };

  async broadcastEtherTopup(opt) {
    const { wlt, eid } = this.state;

    this.setState({snackbarMsg: 'Broadcasting ether top-up transaction to ethereum network...', showSnackbar: true});

    web3.eth.defaultAccount = web3.eth.defaultAccount || web3.eth.accounts[0];
    try {
      const tx = await wlt.sendEtherToEIDAsync(eid, 'Ether Top-up', { gas: 300000, value: web3.toWei(opt.amount, 'ether') });
      this.pushNotification('Token Top-up', `Transaction receipt: ${tx}`, 'success', tx);
    } catch (e) {
      this.pushNotification('Transfer failed', `An error occurred while trying to broadcast...`, 'error');
      console.log(e);
    }
  }

  async broadcastTokenTopup(opt) {
    const { wlt, eid } = this.state;

    this.setState({snackbarMsg: 'Broadcasting token top-up transaction to ethereum network...', showSnackbar: true});

    web3.eth.defaultAccount = web3.eth.defaultAccount || web3.eth.accounts[0];
    try {
      const tx = await wlt.sendTokensToEIDAsync(eid, opt.token, opt.amount, 'Token Top-up', { gas: 300000 });
      this.pushNotification('Token Top-up', `Transaction receipt: ${tx}`, 'success', tx);
    } catch (e) {
      this.pushNotification('Transfer failed', `An error occurred while trying to broadcast...`, 'error');
      console.log(e);
    }
  }

  render() {
    const {showSnackbar, snackbarMsg, sentList, sentLoading, receivedList, receivedLoading, extractedCrt} = this.state;
    // const contentStyle = {margin: '0 16px', textAlign: 'center'};
    // const circleLoad = <div style={{textAlign: 'center', marginTop: 24}}>{CircularLoading({size: 50, weight: 3})}</div>;

    const formattedSentList = sentList.map((item, index) => {
          if (index === 0)
            item.first = true;
          else
            item.first = false;

          item.tokenInfo = this.state.balance;
          return ListElement(item);
        });
    const sentPage = sentLoading ? '' : formattedSentList;

    const formattedReceivedList = receivedList.map((item, index) => {
          if (index === 0)
            item.first = true;
          else
            item.first = false;

          item.tokenInfo = this.state.balance;
          return ListElement(item);
        });
    const receivedPage = receivedLoading ? '' : formattedReceivedList;

    const txPage = <Paper>
      <Subheader style={{
        fontWeight: 600
      }}>Transaction History</Subheader>
      <Divider/>
      <div style={{display: 'flex', flexWrap: 'wrap', margin: -2}}>
        <div style={{boxSizing: 'border-box', padding: '2px', width: '50%'}}>
          <GridTile style={{textAlign: 'left', minHeight: 180}}>
            <Subheader style={{
              fontWeight: 600
            }}>Sent</Subheader>
            <Divider/>
            <List>{ sentPage }</List>
          </GridTile>
        </div>

        <div style={{width: '2px', backgroundColor: '#E0E0E0', margin: ' 0 -4px'}}></div>
        <div style={{boxSizing: 'border-box', padding: '2px', width: '50%'}}>
          <GridTile style={{textAlign: 'left'}}>
            <Subheader style={{
              fontWeight: 600
            }}>Received</Subheader>
            <Divider/>
            <List>{ receivedPage }</List>
          </GridTile>
        </div>
      </div>
    </Paper>
    return (
      <div style={{padding: '20px 0 60px'}}>

        {extractedCrt ? WalletCard({ state: this.state, selectToken: this.selectToken.bind(this), handleTransfer: this.handleTransferButton.bind(this), handleEtherTopup: this.handleEtherTopup.bind(this), handleTokenTopup: this.handleTokenTopup.bind(this) }) : <h4 style={{textAlign: 'center', opacity: 0.54}}>Attempting to load Wallet... <br/><br/> Ensure your Estonian Digi-ID card is connected and the page is loaded via HTTPS...</h4>}
        {extractedCrt ? txPage : ''}
        <Snackbar
          open={showSnackbar}
          message={snackbarMsg}
          autoHideDuration={4000}
          onRequestClose={() => this.setState({showSnackbar: false})}
        />
      <DialogAlert ref='alertPopup' />
      <DialogTransfer ref='transferPopup' transferCall={this.broadcastTokenTransfer.bind(this)} />
      <DialogEtherTopup ref='etherPopup' etherCall={this.broadcastEtherTopup.bind(this)} />
      <DialogTokenTopup ref='tokenPopup' tokenCall={this.broadcastTokenTopup.bind(this)} />
      </div>
    );
  }
}

// Balance graphics
class ChipArray extends React.Component {

  state = { chipData: [] };

  styles = {
    chip: {
      margin: 4,
      borderWidth: 2,
      borderStyle: 'outset'
    },
    selectedChip: {
      margin: 4,
      borderWidth: 2,
      borderStyle: 'inset',
    },
    selectedLabel: {
      fontStyle: 'italic',
      fontWeight: 600
    },
    wrapper: {
      display: 'flex',
      flexWrap: 'wrap',
    },
  };


  componentWillReceiveProps() {
    this.setupChipData();
  };

  setupChipData() {
    let { chipData } = this.state;
    const { balance } = this.props;
    Object.keys(balance).map(token => {
      const t = balance[token];
      const isEther = token === '0x0000000000000000000000000000000000000000' ? true : false;
      const formattedAmount = web3.toBigNumber(t.amount).div(Math.pow(10, t.decimals)).toFixed();
      const icon = isEther ? etherPic : Blockies({ seed: token || '', size: 8, scale: 16}).toDataURL();
      const index = chipData.map(chip => chip.key ).indexOf(token);
      if (index >= 0)
        chipData[index] = {key: token, label: `${formattedAmount} ${t.symbol}`, icon, selected: chipData[index].selected};
      else
        chipData.push({key: token, label: `${formattedAmount} ${t.symbol}`, icon})
    });
    this.setState({chipData});
  }

  async handleClick(key) {
    const { chipData } = this.state;

    const index = chipData.map((chip, i) => { delete chipData[i].selected; return chip.key; }).indexOf(key);
    chipData[index].selected = true;
    const selectedToken = key;

    this.props.selectToken(selectedToken);
    this.setState({chipData});
  };

  renderChip(data) {
    return (
      <Chip
        key={data.key}
        style={data.selected ? this.styles.selectedChip : this.styles.chip}
        labelStyle={data.selected ? this.styles.selectedLabel : { }}
        onTouchTap={() => this.handleClick(data.key)}
      >
        <Avatar src={ data.icon } alt='icon' />
        {data.label}
      </Chip>
    );
  }

  render() {
    const { chipData } = this.state;
    return (
      <div style={this.styles.wrapper}>
        {chipData.length > 0 ? chipData.map(this.renderChip, this) : <h4 style={{color: 'rgba(0, 0, 0, 0.541176)'}}>Checking for Wallet Balances...</h4 >}

      </div>
    );
  }
}

class DialogAlert extends React.Component {
  state = {
    open: false,
  };

  handleOpen = () => {
    this.setState({open: true});
  };

  handleClose = () => {
    this.setState({open: false});
  };

  render() {
    const actions = [
      <FlatButton
        label='OK'
        primary={true}
        onTouchTap={this.handleClose}
      />,
    ];

    return (
      <Dialog
        title='Error: no balance selected'
        actions={actions}
        modal={true}
        open={this.state.open}
        onRequestClose={this.handleClose}
      >
        <p>Select a balance in your wallet first!</p>
      </Dialog>
    );
  }
}

class DialogTransfer extends React.Component {
  state = {
    open: false,
    receiverType: 'EID',
    receiver: '',
    amount: '',
    note: '',
    tokenInfo: {}
  };

  handleOpen = () => {
    this.setState({open: true});
  };

  handleClose = () => {
    this.setState({open: false, note: ''});
  };

  handleToggle = () => {
    let { receiverType } = this.state;
    if (receiverType === 'EID')
      receiverType = 'Ethereum Address';
    else
      receiverType = 'EID';
    this.setState({ receiverType });
  };

  setTokenInfo(tokenInfo) {
    this.setState({tokenInfo});

  }

  render() {
    const { open, receiverType, receiver, amount, note, tokenInfo } = this.state;
    const isEID = receiverType === 'EID';

    const allFieldsFilled = receiver.length > 0 && amount.length > 0 && note.length > 0;

    const eidCheck = isNaN(receiver) ? 'Error: EID must be in numeric form...' : null;
    const parsedReceiver = parseInt(receiver, 10);
    const eidFormatCheck = receiver !== '' && (parsedReceiver < 10000000000 || parsedReceiver > 99999999999 || !Number.isInteger(parsedReceiver)) ? 'Warning: Invalid EID format... expected 11-digit serial number' : null;

    const addressInputChecksum = web3Methods.isAddress(receiver) &&
    !web3Methods.isChecksumAddress(receiver) ? 'Warning: Address Checksum failed...' : null;
    const addressInputHexCheck = web3Methods.isNotHex(receiver) ? 'Error: Non-hexadecimal characters detected...' : null;
    const addressPrefixCheck = web3Methods.isInvalidPrefix(receiver) ? 'Error: Incorrect prefix detected... Prefix with \'0x\'' : null;

    const tokenAmount = web3.toBigNumber(tokenInfo.amount).div(Math.pow(10, tokenInfo.decimals));
    const maxAmountCheck = tokenAmount.lessThan(web3.toBigNumber(amount)) ? `Error: Amount entered greater than your wallet's balance...` : null;
    const minAmountCheck = amount !== '' && amount <= 0 ? 'Error: Amount must be non-zero positive value...' : null;

    // Submit button checks (remove formatcheck and checksum if too strict)
    const allValidEID = !eidCheck && !eidFormatCheck;
    const allVaidAddress = !addressPrefixCheck && !addressInputChecksum && !addressInputHexCheck && web3Methods.isAddress(receiver);
    const allValidAmount = !maxAmountCheck && !minAmountCheck;

    const buttonStyle = {
      margin: '0px 16px 16px 0px'
    };
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onTouchTap={this.handleClose}
        style={buttonStyle}
      />,
    <RaisedButton
        label='Submit'
        primary={true}
        disabled={!allFieldsFilled || !allValidAmount || (isEID ? !allValidEID : !allVaidAddress)}
        onTouchTap={() => { this.props.transferCall({isEID, receiver, note, tokenAddress: tokenInfo.address, amount: web3.toBigNumber(amount).mul(Math.pow(10, tokenInfo.decimals))}); console.log('TOKEN INFO: ' + tokenInfo); this.handleClose(); }}
        style={buttonStyle}
      />,
    ];
    const style = {
      marginLeft: '5%',
      marginBottom: 16,
      width: '90%'
    };

    return (
      <Dialog
        title={'Transfer Details for sending ' + tokenInfo.symbol}
        actions={actions}
        modal={true}
        open={open}
      >
        <Toggle
          label={'Recipient Type: ' + receiverType }
          labelPosition='right'
          style={{ marginLeft: '5%', marginTop: 20, marginBottom: 2, width: 'auto' }}
          onToggle={this.handleToggle}
          />
        <TextField hintText='Recipient' style={style} underlineShow={true} value={receiver} onChange={(e, receiver) => this.setState({receiver})} errorText={ isEID ? eidCheck || eidFormatCheck : addressPrefixCheck || addressInputChecksum || addressInputHexCheck }/>
        <TextField hintText={`Amount of ${tokenInfo.symbol} to send`} style={style} value={amount} onChange={(e, amount) => { if(!isNaN(amount)) this.setState({amount}); } } errorText={maxAmountCheck || minAmountCheck} />
        <TextField hintText='Note' style={style} value={note} onChange={(e, note) => this.setState({note})} />

      </Dialog>
    );
  }
}

class DialogEtherTopup extends React.Component {
  state = {
    open: false,
    amount: ''
  };

  handleOpen = () => {
    this.setState({open: true});
  };

  handleClose = () => {
    this.setState({open: false});
  };

  render() {
    const { open, amount } = this.state;

    // TODO balance check?
    const minAmountCheck = amount !== '' && amount <= 0 ? 'Error: Amount must be non-zero positive value...' : null;

    const buttonStyle = {
      margin: '0px 16px 16px 0px'
    };
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onTouchTap={this.handleClose}
        style={buttonStyle}
      />,
    <RaisedButton
        label='Submit'
        primary={true}
        disabled={minAmountCheck !== null || amount === ''}
        onTouchTap={() => { this.props.etherCall({ amount }); this.handleClose(); }}
        style={buttonStyle}
      />,
    ];
    const style = {
      marginLeft: '5%',
      marginBottom: 16,
      width: '90%'
    };

    return (
      <Dialog
        title='Enter amount of ether to top up this wallet with'
        actions={actions}
        modal={true}
        open={open}
      >
        <TextField hintText={`Amount of ETH to send`} style={style} value={amount} onChange={(e, amount) => { if(!isNaN(amount)) this.setState({amount}); } } errorText={minAmountCheck} />

      </Dialog>
    );
  }
}

class DialogTokenTopup extends React.Component {
  state = {
    open: false,
    token: '',
    amount: ''
  };

  handleOpen = () => {
    this.setState({open: true});
  };

  handleClose = () => {
    this.setState({open: false});
  };

  render() {
    const { open, amount, token } = this.state;

    const addressInputChecksum = web3Methods.isAddress(token) &&
    !web3Methods.isChecksumAddress(token) ? 'Warning: Address Checksum failed...' : null;
    const addressInputHexCheck = web3Methods.isNotHex(token) ? 'Error: Non-hexadecimal characters detected...' : null;
    const addressPrefixCheck = web3Methods.isInvalidPrefix(token) ? 'Error: Incorrect prefix detected... Prefix with \'0x\'' : null;

    const minAmountCheck = amount !== '' && amount <= 0 ? 'Error: Amount must be non-zero positive value...' : null;

    const buttonStyle = {
      margin: '0px 16px 16px 0px'
    };
    const actions = [
      <FlatButton
        label='Cancel'
        primary={true}
        onTouchTap={this.handleClose}
        style={buttonStyle}
      />,
    <RaisedButton
        label='Submit'
        primary={true}
        disabled={minAmountCheck !== null || amount === '' || addressPrefixCheck !== null || addressInputChecksum !== null || addressInputHexCheck !== null}
        onTouchTap={() => { this.props.tokenCall({amount, token}); this.handleClose(); }}
        style={buttonStyle}
      />,
    ];
    const style = {
      marginLeft: '5%',
      marginBottom: 16,
      width: '90%'
    };

    return (
      <Dialog
        title='Enter token address and amount to top up this wallet with'
        actions={actions}
        modal={true}
        open={open}
      ><div style={style}>
        <p>Ensure you are entering the contract address of an ERC-20 token, and that you have approved this wallet contract's address</p>
        <p>Wallet Address: { CONTRACT_WALLET }</p>
      </div>
        <TextField hintText='ERC-20 Token Contract Address' style={style} value={token} onChange={(e, token) => this.setState({token})} errorText={ addressPrefixCheck || addressInputChecksum || addressInputHexCheck }/>
        <TextField hintText={`Amount of Tokens to send (No decimals, use base unit)`} style={style} value={amount} onChange={(e, amount) => { if(!isNaN(amount)) this.setState({amount}); } } errorText={minAmountCheck} />

      </Dialog>
    );
  }
}
