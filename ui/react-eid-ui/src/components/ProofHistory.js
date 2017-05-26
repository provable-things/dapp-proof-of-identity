import React from 'react';
import Promise from 'bluebird';
import * as web3Methods from './Web3Methods';
import Blockies from './Blockies';
import web3 from './Web3';
import Async from './Async';

import {List, ListItem} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import Avatar from 'material-ui/Avatar';
import Paper from 'material-ui/Paper'
import CircularProgress from 'material-ui/CircularProgress';
import FontIcon from 'material-ui/FontIcon';

const checkCircleIcon = <FontIcon className="material-icons">check_circle</FontIcon>;

const AsyncValidCheck = (address) => <Async key={address} promise={web3Methods.callIsValidatedEID(address)} then={(val) => <span style={{float: 'right', margin: '0 1rem 0 0'}}>{val ? checkCircleIcon : null}</span>}/>

const ListElement = (props) => {
  let divider = null;
  if (!props.first)
    divider = <Divider inset={true} />;

  const base64Icon = Blockies({ seed: props.address || '', size: 8, scale: 16}).toDataURL();
  const subheader = <Subheader inset={true} style={{fontWeight: 600}}>{web3.toChecksumAddress(props.address)}</Subheader>;
  const list =
    <ListItem key={props.address}
      leftAvatar={<Avatar src={base64Icon} />}
      primaryText={props.name}
      secondaryText={
          <div>
            Requested linking at block #{props.bn}
            {AsyncValidCheck(props.address)}
          </div>
      }
      secondaryTextLines={2}
      onTouchTap={() => window.open(`#/check?${props.address}`, '_blank')}
    />;

  return([divider, subheader, list]);
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
    con: null,
    db: null,
    dbCreationBlock: 0,
    dbCreationPromise: null,
  }

  async componentDidMount() {
    const instancePromises = {
      con: web3Methods.getInstance('con'),
      db: web3Methods.getInstance('db')
    };

    const { con, db } = await Promise.props(instancePromises);

    let resolved, rejected;
    const dbFetchPromise = new Promise((resolve, reject) => {
      resolved = resolve;
      rejected = reject;
    });

    this.setState({
      loading: true,
      con: con,
      db: db,
      dbCreationPromise: dbFetchPromise
    });
    //this.pushNotification('hi', 'hi\nhi\n\nhi', 'info')
    this.startBlockFilter(resolved, rejected);
    this.startAddedFilter();
  }

  startBlockFilter(resolved, rejected) {
    const filter = this.state.con.LOG_updatedDatabase({ addr: this.state.db.address }, { fromBlock: 0, toBlock: 'pending' }, (error, result) => {
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
    const filter = this.state.db.addedEID(null, { fromBlock: this.state.dbCreationBlock }, (error, result) => {
      const cn = result.args.commonName.split(',');
      const name = `${cn[1]} ${cn[0]}`;
      const eid = cn[2];

      // add to beginning of list, to get descending ordering
      let updatedList = this.state.list;
      updatedList.unshift(
        {
          address: result.args.linked,
          name: name,
          eid: eid,
          bn: result.blockNumber
        }
      );

      this.setState({
        list: updatedList,
        loading: false
      });
      /*this.pushNotification('Transaction Success', `Beginning RSA verification of certificate using Oraclize for ${cnOut}`, 'success');
      filter.stopWatching();*/
      //addedEvent.stopWatching();
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
          <Subheader style={{fontWeight: 600}}>Most Recent Linkings</Subheader>
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
