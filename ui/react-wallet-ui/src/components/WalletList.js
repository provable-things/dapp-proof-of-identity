import React from 'react';
import Promise from 'bluebird';
import * as web3Methods from './Web3Methods';
import Blockies from './Blockies';
import web3 from './Web3';

import {List, ListItem} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import Avatar from 'material-ui/Avatar';
import Paper from 'material-ui/Paper'
import CircularProgress from 'material-ui/CircularProgress';
import ether from '../img/eth.png';
import erc20ABI from '../json/erc20infoABI.json';

const CircularLoading = (props) => (
  <div>
    <CircularProgress size={props.size} thickness={props.weight} />
  </div>
);

const nestedLoading = (props) => (
  <ListItem
    key={props + '0'}
    disabled={true}
    children={
    <div>
      <Divider inset={true}/>
      <ListItem
        key={props + '1'}
        primaryText={<div>Loading wallet balances... </div>}
        leftAvatar={CircularLoading({ size: 36, weight: 3})}
        disabled={true}
      />
    </div>}
  />
)

const etherTokenImg = () => (
  <img src={ether} width='48px' height='48px' style={{left: '12px', top: '4px'}} alt='ether'/>
)

const nestedElement = (props, keyPrefix) => {

  const isEther = props.address === '0x0000000000000000000000000000000000000000';
  const formattedAmount = web3.toBigNumber(props.amount).div(Math.pow(10, props.decimals)).toFixed();
  const formattedTime = new Date(parseInt(props.time) *1000).toLocaleString();
  const formattedAvatar = (isEther ? etherTokenImg() : <Avatar src={Blockies({ seed: props.address || '', size: 8, scale: 16}).toDataURL()} />);
  return (
    <ListItem
      key={keyPrefix + props.address + '0'}
      disabled={true}
      children={
      <div>
        <Divider inset={true}/>
        <ListItem
          key={keyPrefix + props.address + '1'}
          primaryText={<div>{props.name} - {formattedAmount} {props.symbol}<span style={{float: 'right', fontSize: 14, opacity: 0.54}}>Last Change - {formattedTime}</span></div>}
          leftAvatar={formattedAvatar}
          disabled={isEther}
          onTouchTap={() => window.open(`https://kovan.etherscan.io/token/${props.address}`, '_blank')}
        />
      </div>}
    />
  );
}

const ListElement = (props, getBalanceFnc) => {
  let divider = null;
  if (!props.first)
    divider = <Divider />;

  const list =
    <ListItem
      key={props.key}
      primaryText={props.name}
      primaryTogglesNestedList={true}
      secondaryText={
        <p>
          EID: {props.key}
        </p>
      }
      onNestedListToggle={() => getBalanceFnc(props.key)}
      nestedItems={props.loader ? [nestedLoading(props.key)] : Object.keys(props.balance).map(token => nestedElement(props.balance[token], props.key))}
      secondaryTextLines={2}
    />;

  return([divider, list]);
}

export default class Main extends React.Component {
  state = {
    loading: true,
    dict: {},
    con: null,
    db: null,
    wlt: null,
    dbCreationBlock: 0,
    dbCreationPromise: null,
    walletBirthBlock: 0
  }

  async componentDidMount() {
    const instancePromises = {
      con: web3Methods.getInstance('con'),
      db: web3Methods.getInstance('db'),
      wlt: web3Methods.getInstance('wlt')
    };

    const { con, db, wlt } = await Promise.props(instancePromises);

    let resolved, rejected;
    const dbFetchPromise = new Promise((resolve, reject) => {
      resolved = resolve;
      rejected = reject;
    });

    const walletBirthBlock = (await wlt.birthBlock_Async()).valueOf();

    this.setState({
      con,
      db,
      wlt,
      dbCreationPromise: dbFetchPromise,
      walletBirthBlock
    });
    this.startBlockFilter(resolved, rejected);
    this.startAddedFilter();
  }

  startBlockFilter(resolved, rejected) {
    this.state.con.LOG_updatedDatabase({ addr: this.state.db.address }, { fromBlock: 0, toBlock: 'pending' }, (error, result) => {
      if (error) {
        console.log('Error while fetching db creation block:' + error.message);
        rejected();
        return;
      }

      this.setState({ dbCreationBlock: result.blockNumber });
      resolved();
      //console.log('Fetching db event took: ' + (performance.now() - t0) + 'ms');
      //t0 = performance.now();
      //filter.stopWatching();

    });
  }

  async startAddedFilter() {
    await this.state.dbCreationPromise;
    const { dbCreationBlock } = this.state;
    const self = this;
    this.state.db.addedCrt(null, { fromBlock: dbCreationBlock }, async function (error, result)  {
      const { args } = result;

      const cn = args.commonName.split(',');
      const name = `${cn[1]} ${cn[0]}`;
      const eid = args.serial;

      // setup keys if eid isnt already present/
      if (!(eid in self.state.dict)) {

        self.state.dict[eid] = {name: name, child: [], balance: {}};
      }

      self.state.dict[eid].loader = true;

      self.setState({
        dict: self.state.dict,
        loading: false
      });
    });
  }

  async getBalance(eid) {
    // find and account all balances for this eid's wallet
    if (this.state.dict[eid].startedBalanceLoader)
      return;
    const start = new Date();

    this.state.dict[eid].startedBalanceLoader = true;
    this.setState({ dict: this.state.dict });

    const { wlt, walletBirthBlock } = this.state;
    const self = this;
    wlt.LOG_balanceUpdate({serial: eid}, { fromBlock: walletBirthBlock }).get(async function (error, result)  {

      let balance = self.state.dict[eid].balance;

      for(let i = 0; i < result.length; i++) {
        const { args } = result[i];

        balance[args.token] = { amount: args.amount.valueOf(), time: args.time.valueOf() };

      }

      Object.keys(balance).map(async token => {
        balance[token].address = token;
        if (token === '0x0000000000000000000000000000000000000000') {
          balance[token].name = 'Ether';
          balance[token].decimals = 18;
          balance[token].symbol = 'ETH';
        }
        else {
          balance[token].name = 'Token';
          balance[token].decimals = 0;
          balance[token].symbol = '';
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
          } catch (e) {
            console.log('Failed retrieving token infos: ' + e);
          }
        }
      });
      // throttle requests, make loader appear for at least 1 second
      await new Promise(resolve => setTimeout(resolve, 1000 - (new Date() - start)));

      self.state.dict[eid].loader = false;
      self.setState({
        dict: self.state.dict,
        loading: false
      });

    });
  }

  render() {
    //const reversedList = this.state.dict.reverse();
    //let addressCount = 0;
    const dict = Object.keys(this.state.dict).map(eid => {

      let elem = this.state.dict[eid];
      //addressCount += elem.child.length;
      elem.key = eid;
      return ListElement(elem, this.getBalance.bind(this));
    });

    const idCount = Object.keys(this.state.dict).length;

    let page;

    if (this.state.loading) {
      page = <div style={{textAlign: 'center', marginTop: '10vh'}}>{ CircularLoading({ size: 100, weight: 7 }) } </div>
    }
    else {
      page =
      <Paper>
        <List>
          <Subheader style={{fontWeight: 600}}>{idCount} Active Wallet{idCount === 1 ? '' : 's'} </Subheader>
          { dict }
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
