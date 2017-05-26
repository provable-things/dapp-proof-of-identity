import React, {Component} from 'react';
import FontIcon from 'material-ui/FontIcon';
import {BottomNavigation, BottomNavigationItem} from 'material-ui/BottomNavigation';
import Paper from 'material-ui/Paper';

const listIcon = <FontIcon className="material-icons">view_list</FontIcon>;
const linkIcon = <FontIcon className="material-icons">card_membership</FontIcon>;
const checkIcon = <FontIcon className="material-icons">verified_user</FontIcon>;
const historyIcon = <FontIcon className="material-icons">history</FontIcon>;

/**
 * Bottom Nav template, add items and their corresponding hash link
 */
class BottomNav extends Component {

  select = (page) => this.props.setPage(page);

  render() {
    return (
      <Paper
      zDepth={1}
      style={{position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 10}}
      >
        <BottomNavigation
        selectedIndex={this.props.selectedIndex}
        style={{}}
        >
          <BottomNavigationItem
            label="List IDs"
            icon={listIcon}
            onTouchTap={() => this.select('list')}
          />
          <BottomNavigationItem
            label="Check"
            icon={checkIcon}
            onTouchTap={() => this.select('check')}
          />
          <BottomNavigationItem
            label="Link"
            icon={linkIcon}
            onTouchTap={() => this.select('link')}
          />
          <BottomNavigationItem
            label="History"
            icon={historyIcon}
            onTouchTap={() => this.select('history')}
          />
        </BottomNavigation>
      </Paper>
    );
  }
}

export default BottomNav;
