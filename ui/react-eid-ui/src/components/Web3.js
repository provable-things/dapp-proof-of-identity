import * as constant from './Constant';
import Promise from 'bluebird';
import Web3js from 'web3';

let web3 = typeof(window.web3) !== 'undefined' ? window.web3 : new Web3js(new Web3js.providers.HttpProvider(constant.LOCAL_NODE));
web3.isRemote = true;

try {
    if (web3.isConnected() === true) {
        web3.isRemote = false;
    }
    else {
        throw new Error('No local node connection available...');
    }
}
catch (e) {
    web3 = new Web3js(new Web3js.providers.HttpProvider(constant.REMOTE_NODE));
    web3.isRemote = true;
}

// overrides local node
/*web3 = new Web3js(new Web3js.providers.HttpProvider(constant.REMOTE_NODE));
web3.isRemote = true;*/
//window.web3 = web3;

Promise.promisifyAll(web3.eth);


export default web3;
