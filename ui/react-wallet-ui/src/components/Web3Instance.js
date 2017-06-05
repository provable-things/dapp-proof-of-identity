import * as constant from './Constant';
import conABI from '../json/connectorABI.json';
import dbABI from '../json/databaseABI.json';
import wltABI from '../json/walletABI.json';
import Promise from 'bluebird';
import web3 from './Web3';

async function initInstances() {
    const conContract = web3.eth.contract(conABI);
    const dbContract = web3.eth.contract(dbABI);
    const wltContract = web3.eth.contract(wltABI);

    const con = Promise.promisifyAll(conContract.at(constant.CONTRACT_CONNECTOR));
    const wlt = Promise.promisifyAll(wltContract.at(constant.CONTRACT_WALLET));

    // load other intances in parallel
    const [dbAddress] = await Promise.all([
        con.database_Async()
    ]);

    const db = Promise.promisifyAll(dbContract.at(dbAddress));

     //FOR DEBUGGING
    //window.connector = con;
    //window.interface = itf;
    //window.database = db;
    window.wlt = wlt;
    window.w3 = web3;

    return { con, db, wlt };
}

export default initInstances();
