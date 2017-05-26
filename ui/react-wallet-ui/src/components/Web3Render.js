import { Component } from 'react';
import React from 'karet';
import * as constant from './Constant';
import web3 from './Web3';
import * as web3Props from './Web3Methods';
import { Notify } from './Notification';
import IconButton from 'material-ui/IconButton';

class Web3 extends Component {
  constructor(props) {
    super(props);
    this.state = {
      host: web3.currentProvider.host || camelToText(web3.currentProvider.constructor.name),
      block: 0,
      status: web3.isConnected(),
      netColor: 'white',
      network: 'unknown',
      accounts: web3.eth.accounts
    };
  }

  componentDidMount() {
    web3.version.getNetwork((err, netId) => {
    let net;
    switch (netId) {
      case '1':
        net = 'Mainnet';
        break;
      case '2':
        net = 'Morden';
        break;
      case '3':
        net = 'Ropsten';
        break;
      case '42':
        net = 'Kovan';
        break;
      default:
        net = 'Custom';
      }

      this.setState({
        network: net
      });
    })
    web3Props.getBlock.onValue(x => {
      let prevBlock = this.state.block;

      // loading animation when new block comes in
      if (x > prevBlock && prevBlock !== 0) {
        this.setState({
          netColor: 'chartreuse'
        });
        setTimeout(() => {
          this.setState({
            netColor: 'white'
          });
        } , 500);
      }
      this.setState({
        block: x
      });
    });
  }
  render() {
    const infoBtnStyle = {
      position: 'absolute',
      top: 10,
      right: 40,
      width: 60,
      height: 60
    }
    const iconStyle = {
      fontSize: 48,
      color: this.state.netColor
    }
    const netTip = `Latest block: ${this.state.block} |
    Network: ${this.state.network}`;
    return (
      <div className="Web3">
        <IconButton tooltip={netTip}
          iconClassName="material-icons"
          iconStyle={ iconStyle }
          style={ infoBtnStyle }
          touch={ true }
          tooltipPosition='bottom-left'>
          router
        </IconButton>
        <Notify
          title="Web3 Status"
          message={this.state.status ? `Connected to ${constant.DICT_REMOTE[web3.isRemote]} node via ${this.state.host}` : 'No web3 nodes found...'}
          level={this.state.status ? 'success' : 'error'}
          autoDismiss={this.state.status ? 5 : 0 }
          dismissible={this.state.status ? true : false }
          />
      </div>
    );
  }
}

function camelToText(input) {
  const regex = /([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g;
  return input.replace(regex, '$1$4 $2$3$5');
}

export default Web3;
