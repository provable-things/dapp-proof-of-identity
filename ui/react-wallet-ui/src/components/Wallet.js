import React from 'react';
import * as constant from './Constant';
import BottomNavigation from './BottomNavigation';
import MyWallet from './MyWallet';
import WalletHistory from './WalletHistory';
import WalletList from './WalletList';

import createHistory from 'history/createHashHistory';

const history = createHistory();

class Main extends React.Component {
  state = {
    pageIndex: 0,
    notifications: [],
    pageTree: {
      wallet: 1,
      history: 2,
      list: 0
    },
    subtitles: {
      wallet: 'My Wallet',
      history: 'History',
      list: 'Wallet List'
    }
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.update.bind(this));
  }

  addNotification(n) {
    /*if (typeof(this.state.notifications) === 'undefined')
      this.state.notifications = [];*/
    this.setState({ notifications: this.state.notifications.concat(n) });
  }

  notificationIndex() {
    return this.state.notifications.length || 0;
  }

  setPage(pg) {
    history.push(pg);
    //this.forceUpdate();
  }

  update() {
    this.forceUpdate();
  }

  setSearch(sub) {
    history.push({search: sub});
  }

  render() {
    let pageRender;

    let currentPath = window.location.hash.replace(/(^#\/?|\/$)|\?(\w*)/g, '').split('/')[0];
    /* FOR DEBUG
    console.log(currentPath);
    */
    switch(currentPath) {
      case 'wallet':
        pageRender = <MyWallet
          addMainNotification={this.addNotification.bind(this)}
          notificationIndex={this.notificationIndex.bind(this)}
        />;
        break;
      /*case 'check':
        pageRender = <ProofCheck
          addMainNotification={this.addNotification.bind(this)}
          notificationIndex={this.notificationIndex.bind(this)}
          setPage={this.setPage.bind(this)}
          setSearch={this.setSearch.bind(this)}
        />;
        break;*/
      case 'history':
        pageRender = <WalletHistory/>;
        break;
      case 'list':
        pageRender = <WalletList/>;
        break;
      default:
        pageRender = <WalletList/>;
      currentPath = 'list';
    }
    document.title = `${this.state.subtitles[currentPath]} - ${constant.TITLE}`;
    return (
      <div>
        <div style={{maxWidth: 1000, margin: 'auto', padding: 20}}>
          { pageRender }
        </div>
        { this.state.notifications }
        <BottomNavigation
          setPage={this.setPage.bind(this)}
          selectedIndex={this.state.pageTree[currentPath]}
        />
      </div>
    );
  }
}

export default Main;
