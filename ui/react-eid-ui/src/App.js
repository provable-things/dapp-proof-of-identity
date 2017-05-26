import React, { Component } from 'react';
import oraclize from './img/Oraclize_logo.svg';

import * as constant from './components/Constant';
import './App.css';

import Web3Render from './components/Web3Render';
import * as helper from './components/Helpers';
import appIntroFile from './content/AppIntro.md';
import ReactMarkdown from 'react-markdown';
import NotificationWrapper from './components/Notification';
import ProofIdUI from './components/ProofId';
class App extends Component {
  render() {
    return (
      <div className="App">
        <NotificationWrapper />

        <div className="App-header">
          <img src={oraclize} className="App-logo" alt="logo" />
          <h2>{constant.TITLE}</h2>
        </div>

        <div className="App-intro">
          <ReactMarkdown source={ helper.parseMarkdown(appIntroFile) } />
          <ProofIdUI />
        </div>
        <Web3Render />
      </div>
    );
  }
}

export default App;
