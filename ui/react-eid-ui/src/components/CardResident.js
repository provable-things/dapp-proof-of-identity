import React from 'react';
import Promise from 'bluebird';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import Dialog from 'material-ui/Dialog';
import Blockies from './Blockies';
import Async from './Async';
import * as web3Methods from './Web3Methods';
import web3 from './Web3';


class CardResident extends React.Component {
  async getLastCheck() {
    const address = this.props.details[0];
    try {
      const db = await web3Methods.getInstance('db');
      const ocspEvent = db.linkingStatus({linked: address}, {fromBlock: 0, toBlock: 'pending'});
      Promise.promisifyAll(ocspEvent)
      const eventResult = await ocspEvent.getAsync();
      const lastBlock = eventResult[eventResult.length - 1].blockNumber;
      let lastTime = await Promise.promisify(web3.eth.getBlock)(lastBlock);
      lastTime = lastTime.timestamp;
      return new Date(lastTime * 1000).toLocaleString();
    } catch (e) {
      console.log('Time fetch error: ' + e);
      return null;
    }
  }
  render() {
    const address = this.props.details[0];
    const base64Icon = Blockies({ seed: address || '', size: 8, scale: 16}).toDataURL();
    const addressURL = `https://kovan.etherscan.io/address/${address}`;


    let name = this.props.details[1];
    let id = null;
    let rsa = false, showOCSP = false, ocsp = false, ocspHTML = null;
    let recheckBtn = null, revokeBtn = null;

    try {
      let cnArray = name.split(',');
      name = `${cnArray[1]} ${cnArray[0]}`;
      id = `EID: ${cnArray[2]}`;
      const rsaLevel = this.props.details[9].toNumber();
      rsa = rsaLevel >= 3 ? true : false;
      showOCSP = rsaLevel >= 3 ? true : false;

      if (showOCSP) {
        ocsp = this.props.details[10] === true ? false : true;

        if(rsaLevel === 4) {
          ocspHTML = <span>OCSP Check: <b style={{ color: ocsp ? 'green' : 'red' }}>{ ocsp ? 'Passed' : 'Revoked' }</b><Async promise={this.getLastCheck()} then={val => <span> on {val}</span>}/></span>;
          this.getLastCheck();

          if (ocsp) {
            recheckBtn = <FlatButton label="Query OCSP" primary={true} onTouchTap={web3Methods.sendRecheckOCSP(address)} />;

            revokeBtn = web3Methods.getActiveAccount() === address ? <FlatButton label="Revoke" style={{color: 'red'}} onTouchTap={web3Methods.sendRevokeOwnAddress()} /> : null;
          }
        }
        else if (rsaLevel === 3) {
          ocspHTML = <span>OCSP Check: <b style={{ color: ocsp ? 'black' : 'red' }}>{ ocsp ? 'Pending' : 'Revoked' }</b><Async promise={this.getLastCheck()} then={val => <span> on {val}</span>}/></span>;
          this.getLastCheck();
        }
        else if (rsaLevel === 10) {
            ocspHTML = <span>OCSP Check: <b style={{ color: ocsp ? 'black' : 'red' }}>{ ocsp ? 'Self-revoked' : 'Self-revoked level but revocation flag not set...(should not happen)' }</b></span>
        }
      }
    } catch (e) {
      //console.log('Card Resident Error: '+ e);
      //ignore errors here, as it indicates invalid address
    }
    return (
      <Dialog
        open={this.props.popup}
        onRequestClose={this.props.closePopup}
        bodyStyle={{padding: 2}}
      >
        <Card
          initiallyExpanded={true}
          >
          <CardHeader
            title={name || 'N/A'}
            subtitle={id || null}
            avatar={base64Icon}
            actAsExpander={true}
            showExpandableButton={true}
          />
          <CardText
            expandable={true}
            style={{whiteSpace: 'pre-wrap', lineHeight: '24px'}}
          >
            Ethereum Address: <b><a href={ addressURL } target='_blank'>{ `${address}`}</a></b>
            {'\n'}
            Certificate Hash: <b>{ this.props.details[6] }</b>
            {'\n'}
            RSA Verification: <b title={ rsa ? '' : 'Indicates that either the provided certificate or address message did not pass RSA verification, meaning that this is not the authorized owner of the certificate.'} style={{ color: rsa ? 'green' : 'red' }}>{ rsa ? 'Passed' : 'Not passed' }</b>
            {'\n'}
            { ocspHTML }

          </CardText>
          <CardActions>
            { recheckBtn }
            { revokeBtn }
          </CardActions>
        </Card>
      </Dialog>
    );
  }
}

export default CardResident;
