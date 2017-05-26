import React from 'react';

export default class LayoutTitle extends React.Component {
  componentDidMount() {
    document.title = this.props.title;
  }
  render() {
    return null;
  }
}
