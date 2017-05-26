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


const nestedElement = (props) => (
  <ListItem
    disabled={true}
    children={
    <div>
      <Divider inset={true}/>
      <ListItem
        primaryText={<div>{web3.toChecksumAddress(props.address)}<span style={{float: 'right', fontSize: 14, opacity: 0.54}}>Added at Block #{props.bn}</span></div>}
        leftAvatar={<Avatar src={Blockies({ seed: props.address || '', size: 8, scale: 16}).toDataURL()} />}
        onTouchTap={() => window.open(`#/check?${props.address}`, '_blank')}
      />
    </div>}
  />
)

const ListElement = (props) => {
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
      nestedItems={props.child.map(v => nestedElement(v))}
      secondaryTextLines={2}
    />;

  return([divider, list]);
}

const CircularLoading = (props) => (
  <div>
    <CircularProgress size={props.size} thickness={props.weight} />
  </div>
);

export default class Main extends React.Component {
  state = {
    dict: {},
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
    const self = this;
    const filter = this.state.db.addedEID(null, { fromBlock: this.state.dbCreationBlock }, async function (error, result)  {
      const cn = result.args.commonName.split(',');
      const name = `${cn[1]} ${cn[0]}`;
      const eid = cn[2];
      const linkedAddress = result.args.linked;

      if (!await web3Methods.callIsValidatedEID(linkedAddress))
        return;

      // setup keys if eid isnt already present
      if (!(eid in self.state.dict)) {

        self.state.dict[eid] = {name: name, child: []};
      }

      // add to beginning of dict, to get descending ordering
      self.state.dict[eid].child.unshift(
        {
          address: linkedAddress,
          bn: result.blockNumber
        }
      );

      self.setState({
        dict: self.state.dict,
        loading: false
      });
    });
  }

  render() {
    //const reversedList = this.state.dict.reverse();
    let addressCount = 0;
    const dict = Object.keys(this.state.dict).map(key => {

      let elem = this.state.dict[key];
      addressCount += elem.child.length;
      elem.key = key;
      return ListElement(elem);
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
          <Subheader style={{fontWeight: 600}}>Validated Digital IDs ({idCount} identities & {addressCount} addresses)</Subheader>
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
