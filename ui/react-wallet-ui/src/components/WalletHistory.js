import React from 'react';
import Promise from 'bluebird';
import * as web3Methods from './Web3Methods';
import web3 from './Web3';
import {List, ListItem} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import Paper from 'material-ui/Paper'
import CircularProgress from 'material-ui/CircularProgress';
import FontIcon from 'material-ui/FontIcon';
import createHash from 'create-hash';

const receivedIcon = <FontIcon style={{fontSize: 48, top: 8}} className='material-icons'>add_circle_outline</FontIcon>;
const sentIcon = <FontIcon style={{fontSize: 48, top: 8}} className='material-icons'>remove_circle_outline</FontIcon>;

const ListElement = (props) => {
  let divider = null;
  if (!props.first)
    divider = <Divider inset={true} />;

  const SHA256 = createHash('sha256');
  const propsConcat = Object.keys(props).reduce((result, key) => {
    if (key === 'first')
      return result;

    return result.concat(props[key]);
  }, []);

  const key = SHA256.update(propsConcat.toString()).digest('hex');
  const isEther = props.token === '0x0000000000000000000000000000000000000000';
  const tokenEtherscan = `https://kovan.etherscan.io/token/${props.token}`;
  const formattedToken = isEther ? 'ether' : <a href={tokenEtherscan} target='_blank'>tokens</a>;
  const formattedAmount = isEther ? web3.fromWei(props.amount, 'ether') : props.amount;
  const addressRef = props.senderAddress ? props.senderAddress : props.receiverAddress;
  const addressLink = `https://kovan.etherscan.io/address/${addressRef}`;
  const formattedAddress = <span>address <a href={addressLink} target='_blank'>{addressRef}</a></span>;

  const transactionInfo = props.event === 'LOG_receivedTransfer' ? <div>EID {props.receiverSerial} received {formattedAmount} {formattedToken} from {props.senderSerial === '0' ? formattedAddress : 'EID ' + props.senderSerial} </div> : <div>EID {props.senderSerial} sent {formattedAmount} {formattedToken} to {props.receiverSerial === '0' ? formattedAddress : 'EID ' + props.receiverSerial} </div> ;
  const icon = props.event === 'LOG_receivedTransfer' ? receivedIcon : sentIcon;

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
      leftIcon={icon}
      innerDivStyle={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      disabled={true}
    />;

  return([divider, list]);
}
                        /*  */
const CircularLoading = (props) => (
  <div>
    <CircularProgress size={props.size} thickness={props.weight} />
  </div>
);

export default class Main extends React.Component {
  state = {
    list: [],
    loading: true,
    con: null,
    wlt: null,
    walletBirthBlock: 0
  }

  async componentDidMount() {
    const instancePromises = {
      con: web3Methods.getInstance('con'),
      wlt: web3Methods.getInstance('wlt')
    };

    const { con, wlt } = await Promise.props(instancePromises);

    const walletBirthBlock = (await wlt.birthBlock_Async()).valueOf();

    this.setState({
      con,
      wlt,
      walletBirthBlock
    });

    this.startTxFilter();
  }

  async startTxFilter() {
    const { wlt, walletBirthBlock } = this.state;
    wlt.allEvents({ fromBlock: walletBirthBlock, toBlock: 'pending' }, (error, result) => {
      const { event, args } = result;
      if (event !== 'LOG_receivedTransfer' && event !== 'LOG_sentTransfer')
        return;
      // add to beginning of list, to get descending ordering
      let updatedList = this.state.list;

      //let eventDetails = {};
      const {
        amount,
        note,
        receiverSerial,
        receiverAddress,
        senderAddress,
        senderSerial,
        time,
        token } = args;

      updatedList.unshift(
        {
          amount: amount.valueOf(),
          note: note,
          receiverSerial: receiverSerial.valueOf(),
          receiverAddress: receiverAddress,
          senderAddress: senderAddress,
          senderSerial: senderSerial.valueOf(),
          time: time.valueOf(),
          token: token,
          event: event
        }
      );

      this.setState({
        list: updatedList,
        loading: false
      });
    });
  }

  render() {
    //const reversedList = this.state.list.reverse();

    const list = this.state.list.map((link, index) => {
      if (index === 0)
        link.first = true;
      else
        link.first = false;

      return ListElement(link);
    });

    let page;
    if (this.state.loading || this.state.list.length === 0) {
      page = <div style={{textAlign: 'center', marginTop: '10vh'}}>{ CircularLoading({ size: 100, weight: 7 }) } </div>
    }
    else {
      page =
      <Paper>
        <List>
          <Subheader style={{fontWeight: 600}}>Transaction History</Subheader>
          <Divider/>
          { list }
        </List>
      </Paper>
    }

    return (
      <div style={{padding: '20px 0 80px'}}>
        { page }
      </div>
    );
  }
}
