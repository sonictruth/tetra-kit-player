import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';

import App from './App';


ReactDOM.render(
  <App />,
  document.getElementById('root'),
);

screen.orientation.lock('landscape').catch(error => console.warn(error));
