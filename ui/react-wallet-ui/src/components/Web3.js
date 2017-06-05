import * as constant from './Constant';
import Promise from 'bluebird';
import Web3js from 'web3';
import Reflect from 'harmony-reflect';

let web3 = typeof(window.web3) !== 'undefined' ? window.web3 : new Web3js(new Web3js.providers.HttpProvider(constant.LOCAL_NODE));

// Reflect required due to metamask providing a proxy object
try {
    if (web3.isConnected() === true) {
        Reflect.set(web3, 'isRemote', false);
    }
    else {
        throw new Error('No local node connection available...');
    }
}
catch (e) {
    console.log(e.message);
    web3 = new Web3js(new Web3js.providers.HttpProvider(constant.REMOTE_NODE));
    Reflect.set(web3, 'isRemote', true);
}

// meta-mask race condition workaround
window.addEventListener('load', () => {
    if (web3.isRemote && typeof window.web3 !== 'undefined') {
        Reflect.set(window.web3, 'isRemote', false);
        Promise.promisifyAll(window.web3.eth);
        exports.default = window.web3;
    }
});

Promise.promisifyAll(web3.eth);

export default web3;
