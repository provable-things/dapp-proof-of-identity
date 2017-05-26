import Kefir from 'kefir';
import Promise from 'bluebird';
import web3 from './Web3';
import getInstances from './Web3Instance';
import {sha3} from 'ethereumjs-util';

//window.c = await instance;
// polling interval for reactive functions
const pollInterval = web3.isRemote ? 5000 : 1000;

let con, itf, db;


//catch???
getInstances.then(result => {
  ({ con, itf, db } = result);
});

// initialized usually under 100ms, so shouldn't be issue, that is with
// oraclize node
function waitForInstance(inst) {
  let self = inst === 'db' ? db : (inst === 'itf' ? itf : con);
  return new Promise(async function(resolve, reject) {
    try {
      while(typeof self === 'undefined') {
        await timeout(2);
        self = inst === 'db' ? db : (inst === 'itf' ? itf : con);
      }
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export async function getInstance(inst) {
  await waitForInstance(inst);
  return inst === 'db' ? db : (inst === 'itf' ? itf : con);
}

export async function sendLinkEID(sender, crt, sig) {
  return new Promise(async function (resolve, reject) {
    try {
      await itf.linkEIDAsync(web3.toBigNumber(`0x${crt}`), web3.toBigNumber(`0x${sig}`), {
        from: sender,
        value: web3.toWei(1, 'ether'),
        gas: 4000000
      });

      resolve(true);
    } catch (e) {
      console.log('Send Link Error: ' + e.message);
      reject(e);
    }
  });
}

export async function sendRecheckOCSP(linked) {
  return new Promise(async function (resolve, reject) {
    try {
      await itf.requestOCSPCheck(linked, {
        from: getActiveAccount(),
        value: web3.toWei(0.1, 'ether'),
        gas: 1600000
      });

      resolve(true);
    } catch (e) {
      console.log('Send Recheck OCSP Error: ' + e.message);
      reject(e);
    }
  });
}

export async function sendRevokeOwnAddress(activeAddress) {
  return new Promise(async function (resolve, reject) {
    try {
      await itf.revokeOwnAddress({
        from: activeAddress,
        gas: 1000000
      });

      resolve(true);
    } catch (e) {
      console.log('Send Revoke Self Error: ' + e.message);
      reject(e);
    }
  });
}

async function sendTransaction(from, val, gas, data) {
  await web3.eth.sendTransactionAsync({
    from: from,
    value: val,
    gas: gas,
    data: data
  });
}

async function callResolver(call, args) {
  try {
    return await call.apply(undefined, args);
  } catch (e) {
    console.log(`Call Error: ${e.message}`);
    throw e;
  }
}

export async function callIsValidatedEID(address) {
  // placeholder for future use maybe, if found to be issue
  await waitForInstance('db');
  return callResolver(db.isValidatedEIDAsync, [address]);
}

export async function callValidityDetails(address) {
  await waitForInstance('db');
  return callResolver(db.eResidentValidityAsync, [address]);
}

export async function callResident(address) {
  await waitForInstance('db');
  return callResolver(db.eResidentAsync, [address]);
}

export async function currentBlock() {
  return await web3.eth.getBlockNumberAsync();
}

export function getActiveAccount() {
  return web3.eth.defaultAccount || web3.eth.accounts[0];
}

export const getBlock = Kefir.stream(emitter => {
  pollResult(web3.eth.getBlockNumberAsync, pollInterval, emitter);
});

const nodeCallback = (error, result, emitter) => {
  return result;
}

// ensures node-style callback is rescheduled only after the last one has been received
function getPeriodicCallback(fn, timeout, emitter) {
  fn((e, r) => {
    if (e) {
      emitter.error(e);
    } else {
      emitter.emit(r);
    }
    setTimeout(() => getPeriodicCallback(fn, timeout, emitter), timeout);
  });
}

// ES7 style of above function
async function awaitResult(fn) {
  return await fn();
}

async function pollResult(fn, interval, emitter) {
  while (true) {
    try {
      let r = await fn();
      emitter.emit(r);
    } catch (e) {
      emitter.error(e);
    }
    await timeout(interval)
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//general Helpers
//should be outside of this, general helper functions, helpers.js more appropriate
export function isAddress(address) {
  const regex = /^(0x)([A-Fa-f0-9]{2}){20}$/;
  return regex.test(address);
}

export function isNotHex(address) {
  return /..[^A-Fa-f0-9]/.test(address);
}

export function isInvalidPrefix(address) {
  return /^([^0][^x]?)|^([0][^x])/.test(address);
}

export function isChecksumAddress(address) {
  if (/^(0x)?[0-9a-f]{40}$/.test(address) ||
    /^(0x)?[0-9A-F]{40}$/.test(address)) {
    // If it's all small caps or all all caps, return true
    return true;
  }

  // Check each case
  //
  //var addressHash = web3.sha3(address.toLowerCase(), 16);
  address = address.replace('0x', '');
  const addressHash = sha3(address.toLowerCase()).toString('hex');
  for (let i = 0; i < 40; i++) {
    // the nth letter should be uppercase if the nth digit of casemap is 1
    if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
      return false;
    }
  }
  return true;
}
