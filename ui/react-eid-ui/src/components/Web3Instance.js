import * as constant from './Constant';
import conABI from '../json/connectorABI.json';
import itfABI from '../json/interfaceABI.json';
import dbABI from '../json/databaseABI.json';
import Promise from 'bluebird';
import web3 from './Web3';

async function initInstances() {
    const conContract = web3.eth.contract(conABI);
    const itfContract = web3.eth.contract(itfABI);
    const dbContract = web3.eth.contract(dbABI);

    const con = Promise.promisifyAll(conContract.at(constant.CONTRACT_CONNECTOR));

    // load other intances in parallel
    const [itfAddress, dbAddress] = await Promise.all([
        con.interface_Async(),
        con.database_Async()
    ]);

    const itf = Promise.promisifyAll(itfContract.at(itfAddress));
    const db = Promise.promisifyAll(dbContract.at(dbAddress));

     //FOR DEBUGGING
    window.connector = con;
    window.interface = itf;
    window.database = db;

    return { con, itf, db };
}

export default initInstances();
