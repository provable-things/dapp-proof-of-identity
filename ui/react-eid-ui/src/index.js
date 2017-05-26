import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

import injectTapEventPlugin from 'react-tap-event-plugin';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();
/*
const refresh = 1; // refresh rate in seconds
// make page reactive
setInterval(
  () => {
    ReactDOM.render(
      <App />,
      document.getElementById('root')
    );
  },
  refresh * 1000
);*/

const Main = () => (
  <MuiThemeProvider>
    <App />
  </MuiThemeProvider>
);
ReactDOM.render(
  <Main />,
  document.getElementById('root')
);
