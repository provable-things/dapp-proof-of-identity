import React from 'react';
import * as web3Methods from './Web3Methods';
import { Notify } from './Notification';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Checkbox from 'material-ui/Checkbox';
import Visibility from 'material-ui/svg-icons/action/visibility';
import VisibilityOff from 'material-ui/svg-icons/action/visibility-off';
import CardResident from './CardResident';

export default class ProofCheck extends React.Component {
  state = {
    addressCheck: '',
    details: true,
    processing: false,
    cardPopup: false,
    cardDetails: []
  }

  componentDidMount() {
    this.requestSearch();
    window.addEventListener('hashchange', this.requestSearch.bind(this));
  }

  requestSearch() {
    try {
      this.state.addressCheck = window.location.hash.match(/(?:\?)(\w*)/)[1];
      this.handleCheck();
    } catch (e) {
    }
  }

  pushNotification(title, message, level) {
    const nextNotification = <Notify
      key={ this.props.notificationIndex() }
      title={ title }
      message={ message }
      level={ level }
      autoDismiss={ 0 }
      dismissible={ true }
      position={ 'br' }
    />;

    this.props.addMainNotification(nextNotification);
  }

  closePopup() {
    this.setState({cardPopup: false});
    this.props.setPage('check');
    this.props.setSearch('');
  }
/*
  0xffffffffffffffffffffffffffffffffffffffff
*/
  async handleCheck() {
    this.setState({processing: true});
    try {
      if (this.state.details) {
        let details = [this.state.addressCheck];
        const resultPromises = [
          web3Methods.callResident(this.state.addressCheck),
          web3Methods.callValidityDetails(this.state.addressCheck)
        ];
        const result = await Promise.all(resultPromises);

        // flatten resulting array and merge
        details = [].concat.apply(details, result);
        try {
          window.location.hash.match(/(?:\?)(\w*)/)[1];
        } catch (e) {
          this.props.setSearch(this.state.addressCheck);
        }
        this.setState({
          cardDetails: details.concat(result),
          cardPopup: true
        });
      } else {
        const valid = await web3Methods.callIsValidatedEID(this.state.addressCheck);
        this.pushNotification('EID Check', `${this.state.addressCheck} is ${valid ? '' : 'NOT'} linked to a valid EID`, `${valid ? 'info' : 'warning'}`);
      }
    } catch (e) {
      this.pushNotification('Error', `Node error output: ${e.message}`, 'error');
    }
    this.setState({processing: false});

  }

  render() {
    const { addressCheck } = this.state;
    const addressInputChecksum = web3Methods.isAddress(addressCheck) &&
    !web3Methods.isChecksumAddress(addressCheck) ? 'Warning: Address Checksum failed...' : null;
    const addressInputHexCheck = web3Methods.isNotHex(addressCheck) ? 'Error: Non-hexadecimal characters detected...' : null;
    const addressPrefixCheck = web3Methods.isInvalidPrefix(addressCheck) ? 'Error: Incorrect prefix detected... Prefix with \'0x\'' : null;
    const midComponent = <TextField hintText="0x" floatingLabelText="Ethereum Address to Check" fullWidth={true} value={addressCheck} onChange={(e, text) => this.setState({addressCheck: text})} errorText={addressPrefixCheck || addressInputChecksum || addressInputHexCheck} disabled={this.state.processing}/>

    const heading = <h3>Check if address is valid EID</h3>;

    return (
      <div style={{margin: '0 16px', padding: '20px 0 60px'}}>
        {heading}
        <Checkbox
          checkedIcon={<Visibility />}
          uncheckedIcon={<VisibilityOff />}
          label="Details"
          labelPosition="left"
          labelStyle={{ marginRight: -20 }}
          style={{ textAlign: 'right', float: 'right' }}
          checked={this.state.details}
          onCheck={(err, res) => this.setState({details: res})}
        />
          {midComponent}
        <div style={{textAlign: 'center', margin: 20}}>
          <RaisedButton
            label="Check"
            primary={true}
            disabled={this.state.processing || !web3Methods.isAddress(addressCheck)}
            onTouchTap={this.handleCheck.bind(this)}
          />
        </div>
        <CardResident
          closePopup={this.closePopup.bind(this)}
          popup={this.state.cardPopup}
          details={this.state.cardDetails}
        />
      </div>
    );
  }
}
