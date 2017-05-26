import React from 'react';
import Promise from 'bluebird';
import * as web3Methods from './Web3Methods';
import Blockies from './Blockies';
import web3 from './Web3';
import Async from 'react-promise'

import {List, ListItem} from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import Avatar from 'material-ui/Avatar';
import Paper from 'material-ui/Paper'
import CircularProgress from 'material-ui/CircularProgress';
import FontIcon from 'material-ui/FontIcon';

// TODO: May need try statements around awaits for safety

const checkCircleIcon = <FontIcon className="material-icons">check_circle</FontIcon>;

const isValidated = async function (address) {
  return await web3Methods.callIsValidatedEID(address);
}

class ListElement extends React.Component {
  state = {
    validated: false
  }
  async componentWillReceiveProps(nextProps) {
    this.setState({
      validated: await web3Methods.callIsValidatedEID(nextProps.elem.address)
    });

  }
  render() {
    let divider = null;
    if (!this.props.elem.first)
      divider = <Divider inset={true} />;

    const base64Icon = Blockies({ seed: this.props.elem.address || '', size: 8, scale: 16}).toDataURL();
    const subheader = <Subheader inset={true} style={{fontWeight: 600}}>{web3.toChecksumAddress(this.props.elem.address)}</Subheader>;
    const list =
      <ListItem
        leftAvatar={<Avatar src={base64Icon} />}
        primaryText={this.props.elem.name}
        secondaryText={
            <div>
              Requested linking at block #{this.props.elem.bn}
              {this.state.validated ? <span>{checkCircleIcon}</span> : null}
            </div>
        }
        secondaryTextLines={2}
        onTouchTap={() => window.open(`#/check?${this.props.elem.address}`, '_blank')}
      />;

    return(<div>{divider} {subheader} {list}</div>);
  }
}

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

    });
  }

  render() {
    // if decide to reverse
    //const reversedList = this.state.list.reverse();

    const list = this.state.list.map((link, index) => {
      if (index === 0)
        link.first = true;
      else
        link.first = false;
      return <ListElement
          key={index}
          elem={link}
        />
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
