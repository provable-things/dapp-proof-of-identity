import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import Snackbar from 'material-ui/Snackbar';
import LinearProgress from 'material-ui/LinearProgress';
import {
  Step,
  Stepper,
  StepLabel,
} from 'material-ui/Stepper';
import * as web3Methods from './Web3Methods';
import { sessionLoad, sessionSave } from './SessionStorage';
import { Notify } from './Notification';
import createHash from 'create-hash';

const linkingLevelDict = [
  'Service Error',
  'SHA-1 Computation',
  'Certificate Authenticity Check',
  'Signed Address Message Check',
  'OCSP Revocation Check'
];

const linkingStatusDict = [
  'There was a glitch in the matrix',
  'Succeeded',
  'Please retry this query...',
  'Failed...'
]

const hwcrypto = window.hwcrypto;

export default class ProofLink extends React.Component {

  state = {
    stepIndex: 0,
    addressLink: '',
    snackbarMsg: '',
    showSnackbar: false,
    activeAddressLink: web3Methods.isAddress(sessionLoad('activeAddressLink')) ? sessionLoad('activeAddressLink') : null || null,
    linkFilter: null,
    linkingStatus: null,
    db: null,
    extractedCert: null
  };

  async componentDidMount() {
    const db = await web3Methods.getInstance('db');
    this.setState({ db: db });

    if (this.state.activeAddressLink) {
      this.pushNotification('Verification Listener Active', `Watching for validation updates of ${this.state.activeAddressLink}`, 'info', 4242);
      this.startLinkFilter();
    }
  }

  pushNotification(title, message, level, key) {
    const nextNotification = <Notify
      key={ key || this.props.notificationIndex() }
      title={ title }
      message={ message }
      level={ level }
      autoDismiss={ 0 }
      dismissible={ true }
      position={ 'br' }
    />;
    this.props.addMainNotification(nextNotification);
  }

  startLinkFilter() {
    const filter = this.state.db.linkingStatus({ linking: this.state.activeAddressLink }, { fromBlock: 'pending', toBlock: 'pending' }, (error, result) => {
      let { level, status } = result.args;
      level = level.toNumber();
      status = parseInt(status, 16);

      this.pushNotification(
        linkingLevelDict[level],
        linkingStatusDict[status].concat(
          status === 1 && level < 4
          ? `...\nInitiating ${linkingLevelDict[level + 1]} now`
          : ''
        ),
        status === 1 ? 'success' : (status === 2 ? 'warning' : 'error')
      )

      if (level === 4 || status === 3) {
        sessionSave('activeAddressLink', null);
        filter.stopWatching();

        if (level === 4 && status === 1)
          this.setState({stepIndex: 4});

        if (status === 3)
          this.setState({stepIndex: 2});

        return;
      }
    });
  }

  startAddedFilter() {
    const filter = this.state.db.addedEID({ linking: this.state.activeAddressLink }, { fromBlock: 'pending' }, (error, result) => {
      console.log(result);
      const cn = result.args.commonName.split(',');
      const cnOut = `${cn[1]} ${cn[0]} \nID ${cn[2]}`;
      this.pushNotification('Transaction Success', `Beginning RSA verification of certificate using Oraclize for ${cnOut}`, 'success');
      filter.stopWatching();
      //addedEvent.stopWatching();
    });
  }

  setActiveAddressLink(address) {
    this.setState({ activeAddressLink: address });
    sessionSave('activeAddressLink', address);
  }

  // needs bind this, when this style
  async handleNext() {
    const stepIndex = this.state.stepIndex;
    if (stepIndex === 1) {
      try {
        await this.initHwcrypto();
      } catch (e) {
        alert('There was an error... \n\nEnsure your smart card is correctly inserted and you are connected via HTTPS!');
        console.log(e);
        return;
      }
    }
    else if (stepIndex === 2) {
      this.setState({showSnackbar: true,
      snackbarMsg: 'Broadcasting ethereum transaction...'});
      try {
        const sender = this.state.addressLink;
        const { crt, sig } = await this.hwcryptoCrtAndSig(sender);
        await web3Methods.sendLinkEID(sender, crt, sig)
        this.setActiveAddressLink(sender);
        this.startAddedFilter();
        this.startLinkFilter();
      } catch (e) {
        this.pushNotification('Error', `Node error output: ${e.message}`, 'error');
        return;
      }
    }
    if (stepIndex < 3) {
      this.setState({stepIndex: stepIndex + 1});
    }
  };

  handlePrev = () => {
    const {stepIndex} = this.state;
    if (stepIndex > 0) {
      this.setState({stepIndex: stepIndex - 1});
    }
  };

  async initHwcrypto() {
    hwcrypto.use('auto');
    this.setState({ extractedCert: await hwcrypto.getCertificate({lang: 'en'}) });
  }
  async hwcryptoCrtAndSig(sender) {
    const cert = this.state.extractedCert;
    // get bytes equivalent of address
    const hexAddress = Buffer.from(sender.toLowerCase().substr(2), 'hex');
    const SHA256 = createHash('sha256');
    // get sha256 digest of bytes
    const msgHash = SHA256.update(hexAddress);
    const signedMsg = await hwcrypto.sign(cert, {type: 'SHA-256', value: msgHash.digest()}, {lang: 'en'});
    return { crt: cert.hex, sig: signedMsg.hex };
  }

  getStepContent(stepIndex) {
    switch (stepIndex) {
      case 0:
        return 'Enter the ethereum address to be linked. Must match your sending address...';
      case 1:
        return 'Insert your smart card now...';
      case 2:
        return 'Send transaction to the network...';
      case 3:
        return 'Wait for on-chain processing to complete, can take up to 10 minutes...';
      case 4:
        return `Address ${this.state.addressLink} successfully linked with your EID!`;
      default:
        return 'You\'re a long way from home sonny jim!';
    }
  }

  render() {
    const {stepIndex, addressLink, showSnackbar, snackbarMsg} = this.state;
    const contentStyle = {margin: '0 16px', textAlign: 'center'};

    const addressInputChecksum = web3Methods.isAddress(addressLink) &&
    !web3Methods.isChecksumAddress(addressLink) ? 'Warning: Address Checksum failed...' : null;
    const addressInputHexCheck = web3Methods.isNotHex(addressLink) ? 'Error: Non-hexadecimal characters detected...' : null;
    const addressPrefixCheck = web3Methods.isInvalidPrefix(addressLink) ? 'Error: Incorrect prefix detected... Prefix with \'0x\'' : null;

    let midComponent;

    if (stepIndex === 0) {
      midComponent = <TextField hintText="0x" floatingLabelText="Ethereum Address to Link" fullWidth={true} value={addressLink} onChange={(e, text) => this.setState({addressLink: text})} errorText={addressPrefixCheck || addressInputChecksum || addressInputHexCheck}/>
    } else if (stepIndex < 3) {
      midComponent = <LinearProgress mode={'determinate'} value={stepIndex * 33} style={{
        height: 6,
        display: 'inline-flex',
        marginTop: 50
      }}/>;
  } else if (stepIndex === 3){
    // need to pass undefined first element, so that it successfully changes between
    // determinate and indeterminate, maybe using unique key is more elegant
    midComponent = [,<LinearProgress mode={'indeterminate'} style={{
      height: 6,
      display: 'inline-flex',
      marginTop: 50
    }}/>];
  } else if (stepIndex === 4){
    midComponent = <LinearProgress mode={'determinate'} value={100} style={{
      height: 6,
      display: 'inline-flex',
      marginTop: 50
    }}/>
  }

    return (
      <div style={{padding: '20px 0 60px'}}>
        <Stepper linear={false} activeStep={stepIndex}>
          <Step completed={stepIndex > 0}>
            <StepLabel>
              Enter Ethereum Address
            </StepLabel>
          </Step>
          <Step completed={stepIndex > 1}>
            <StepLabel>
              Insert Digi-ID Card
            </StepLabel>
          </Step>
          <Step completed={stepIndex > 2}>
            <StepLabel>
              Process Transaction
            </StepLabel>
          </Step>
        </Stepper>
        <div style={contentStyle}>
        <div style={{height: 100}}>
          {midComponent}
        </div>
          <p>{this.getStepContent(stepIndex)}</p>
          <div style={{margin: 20}}>
            <FlatButton
              label="Back"
              disabled={showSnackbar || stepIndex === 0 || stepIndex > 2}
              onTouchTap={this.handlePrev}
              style={{marginRight: 12}}
            />
            <RaisedButton
              label="Next"
              disabled={showSnackbar || stepIndex > 2 || (
                stepIndex === 0 && !web3Methods.isAddress(addressLink)
              )}
              primary={true}
              onTouchTap={this.handleNext.bind(this)}
            />
          </div>
        </div>
        <Snackbar
          open={showSnackbar}
          message={snackbarMsg}
          autoHideDuration={4000}
          onRequestClose={() => this.setState({showSnackbar: false})}
        />
      </div>
    );
  }
}
