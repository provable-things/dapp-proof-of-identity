import React, { Component } from 'react';
import NotificationSystem from 'react-notification-system';

let notificationInstance = null;

const defaultStyle = {
  NotificationItem: { // Override the notification item
    DefaultStyle: { // Applied to every notification, regardless of the notification level
      //margin: '190px 0px -180px 0px'
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap'
    }
  }
}

class NotificationWrapper extends Component {
  _notificationSystem = null;

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem;
    notificationInstance = this._notificationSystem;
  }

  getNotificationSystem() {
    return this._notificationSystem;
  }

  render () {
    return (
      <div style={{opacity: 1}}>
        <NotificationSystem
            ref="notificationSystem"
            style={defaultStyle}
        />
      </div>
    );
  }
}

class Notify extends Component {

    _notificationSystem = null;

    _addNotification() {
        //event.preventDefault();
        this._notificationSystem.addNotification({
            title: this.props.title || null,
            message: this.props.message || '',
            level: this.props.level || 'info',
            autoDismiss: this.props.autoDismiss || 0,
            position: this.props.position || 'tr',
            dismissible: this.props.dismissble || true
        });
    }

    componentDidMount() {
        this._notificationSystem = notificationInstance;
        this._addNotification();
    }
    render () {
      return null;
    }
}

export default NotificationWrapper;
export { Notify }
