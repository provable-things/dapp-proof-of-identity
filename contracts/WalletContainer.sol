/*
MIT License

Copyright (c) 2017 Oraclize LTD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

pragma solidity ^0.4.6;

import "oraclizeLib.sol";
import "FixedToDynamic.sol";
import "idOracleLib.sol";

contract OraclesPipeAPI {
    function sendPipe(bytes _pipe) external;
}

contract DigitalIdConnector {
    address public owner_;
    address public database_; //permanent
    address public logic_;
    address public oracle_;
    address public walletOracle_;
    address public interface_;
    address public coster_;


    modifier onlyOwner() { if (msg.sender != owner_) throw; _; }

    event LOG_updatedDatabase(address indexed addr);
    event LOG_updatedLogic(address indexed addr);
    event LOG_updatedOracle(address indexed addr);
    event LOG_updatedWalletOracle(address indexed addr);
    event LOG_updatedInterface(address indexed addr);
    event LOG_updatedCostEstimator(address indexed addr);


    function DigitalIdConnector() {
        owner_ = msg.sender;
    }

    function updateDatabaseAddress(address _database)
    external
    onlyOwner {
        database_ = _database;
        LOG_updatedDatabase(_database);
    }

    function updateLogicAddress(address _logic)
    external
    onlyOwner {
        logic_ = _logic;
        LOG_updatedLogic(_logic);
    }

    function updateOracleAddress(address _oracle)
    external
    onlyOwner {
        oracle_ = _oracle;
        LOG_updatedOracle(_oracle);
    }

    function updateWalletOracleAddress(address _walletOracle)
    external
    onlyOwner {
        walletOracle_ = _walletOracle;
        LOG_updatedWalletOracle(_walletOracle);
    }

    function updateInterfaceAddress(address _interface)
    external
    onlyOwner {
        interface_ = _interface;
        LOG_updatedInterface(_interface);
    }

    function updateCosterAddress(address _coster)
    external
    onlyOwner {
        coster_ = _coster;
        LOG_updatedInterface(_coster);
    }
}

contract DigitalIdInterface {
    DigitalIdConnector public connector_;
    DigitalIdLogic public logic_;
    DigitalIdOracle public oracle_;

    modifier checkLogic() {
        if (logic_ != connector_.logic_()) {
            logic_ = DigitalIdLogic(connector_.logic_());
        }
        _;
    }

    modifier checkOracle() {
        if (oracle_ != connector_.oracle_()) {
            oracle_ = DigitalIdOracle(connector_.oracle_());
        }
        _;
    }

    function DigitalIdInterface(address _connector) {
        connector_ = DigitalIdConnector(_connector);
    }

    function linkEID(bytes _crt, bytes _sig)
    external
    checkLogic
    payable {
        logic_.linkEID.value(msg.value)(msg.sender, _crt, _sig);
    }

    function retryFailedCallback()
    external
    checkOracle
    payable {
        oracle_.retryCallback.value(msg.value)(msg.sender);
        // add event resume
    }

    function retryFailedCallback(address _linked)
    external
    checkOracle
    payable {
        oracle_.retryCallback.value(msg.value)(_linked);
        // add event resume
    }

    function requestOCSPCheck(address _user)
    external
    checkOracle
    payable {
        oracle_.requestPostOCSPCheck.value(msg.value)(_user, msg.sender);
    }

    function revokeOwnAddress()
    external {
        logic_.revocationRequest(msg.sender);
    }

    function getEIDCheckCost()
    external constant
    returns (uint) {
        return DigitalIdCostEstimator(connector_.coster_()).expectedOracleCosts(false);
    }

    function getEIDCheckCostWithSHA1()
    external constant
    returns (uint) {
        return DigitalIdCostEstimator(connector_.coster_()).expectedOracleCosts(true);
    }
}

contract DigitalIdDatabase {
    struct PublicKey {
        bytes mod;
        bytes exp;
    }

    struct Certificate {
        // uint id;
        string commonName;
        PublicKey publicKey;
        bytes crtSignature;
        byte crtSigAlgorithm; // 05 = sha1, // 0b = sha256
        uint40 serialNumber;
        bytes20 parentId;
        bool validated;
        bool ocspRevoked;
        uint ocspLastTimestamp;
        uint ocspLastBlock;
        uint txNonce;
        bytes bodyHash;
    }

    struct Resident {
        bytes32 certificateHash;
        bytes usrSignature;
        uint8 validityLevel;
        bool userRevoked;
    }

    address public owner_;

    mapping (bytes32 => Certificate) private certificate_;
    mapping (address => Resident) private eResident_;
    mapping (bytes20 => bytes) public parentCrts_;

    DigitalIdConnector public connector_;
    DigitalIdLogic public logic_;
    DigitalIdOracle public oracle_;

    modifier onlyOwner() { if (msg.sender != owner_) throw; _; }
    modifier onlyLogic() { if (msg.sender != connector_.logic_()) throw; _; }
    modifier onlyOracle() { if (msg.sender != connector_.oracle_()) throw; _; }
    modifier onlyWalletOracle() { if (msg.sender != connector_.walletOracle_()) throw; _; }
    modifier checkLogic() {
        if (logic_ != connector_.logic_()) {
            logic_ = DigitalIdLogic(connector_.logic_());
        }
        _;
    }
    modifier checkOracle() {
        if (oracle_ != connector_.oracle_()) {
            oracle_ = DigitalIdOracle(connector_.oracle_());
        }
        _;
    }
    function DigitalIdDatabase(address _connector) {
        owner_ = msg.sender;
        connector_ = DigitalIdConnector(_connector);
    }
/* add these manually after the fact as owner
    function whiteListParents()
    private {
        // using ones needed as specified by
        // https://www.sk.ee/en/repository/certs/

        // ESTEID-SK 2011
        parentCrts_[0x7B6AF255505CB8D97A088741AEFAA22B3D5B5776] = hex'b3e97c6c661eabfda5dc35ede44a934c3aa990a005d4a73cdcaf8652686661ffb247222a65bcd8bab5b5bf94aeec02246c6fae4accc5913846ae95deba8206c33e06ba914f7b0be0171aeefe0d1397b2d8d43afe9596b1d95409cb9883a4c9ca566b18ccf847d03d9b83c446e4c3de81dff7c6ebd65ba77b3dcba58487053963d222425f184e41a7354c627506ce375046426f87544b204dfdb627aafa1b716c134eeb9cc36c90d0b70e3b8b48250a178907d2b54654af4176209d15a6631c4ca48f08c81b3aa7cb1c9129ee186c9e81f40066f797921603011ed644614faad15508406840180bab3935e35a2d53b2c038da69cb190644239197317b5a6e9e75';

        // ESTEID-SK 2015
        parentCrts_[0xB3AB88BC99D562A4852A08CDB41D723B83724751] = hex'd281fad4d0f16dd5bd93c9cb035a8668be01eefc9da1dd84c29fd24c1641df012d20908b764a44b12f295df16246ac0356c80619bbbe43df6dae56f92c8ef28bbac8911a2fe4d7ed05d48d3d2539ac08583d086f6594203b045a1dae44cbe05a2c91e62ea6104bd850bd0b02632c2cfb156f3455292b4a460fae22c9ca9d32e065fe75aaddf2ee669a70061d15165b66e2786bff54b447d4d1269a855066c6af838afc3c1e6d0e4f8e1752e3480250dc260bb7cf438bc81fec7e4c2936686faedcca00cf422ba555aa8b0cc6fefc6b7ae3cf02481778509e61fe9f5cbb06cf85a2bec6456e9876a4c8c42eeeac96d9415df006ddf1afe37b7dd555e2732cd1fde4f976c07ecc5b16d6c1d5fb538d3ebfaace00f1087d9c9aeaa864d7c822af9bba86f7780f1e7be5e924a250afed6a1ab9a18208ef02173b9ba714e31fd07f1c1162121536125ffac2954e191085b27d5f1b8a937735f30ca6c0bd66a430f43c8189aa5b2c31e8ae2782336a015b80448634351de22726d21413f029907949b519b59e058b1ea8f84c417f7b40504b5c92d5cb6482ca8033ec1ab5a80e37fbe11c89b37ec817359d0b36668abc724f4c2b46c2c4331e524414cfa55e406a7af4898e42bb30e3aa93cf49ad750acc49b9e45c2b8b6a7e5d3e6dbce09f4799aaa2622ea3e8a2dc6763645270d015eb015653049be7c76b6891ea59c0158674e941';

    }
        */
    function onlyOwnerModifier()
    private
    onlyOwner {
    }

    function onlyLogicModifier()
    private
    onlyLogic {
    }

    function checkIdOracleModifier()
    private
    checkOracle {
    }

    function onlyIdOracleModifier()
    private
    onlyOracle {
    }

    function onlyWalletOracleModifier()
    private
    onlyWalletOracle {
    }

    function addParent(bytes20 _id, bytes _modulus)
    external {
        onlyOwnerModifier();
        parentCrts_[_id] = _modulus;
    }

    function removeParent(bytes20 _id)
    external {
        onlyOwnerModifier();
        delete parentCrts_[_id];
    }

    // status: 0x01 = pass
    // 0x02 = internal error; retryable
    // 0x03 = sig verification fail
    // 0x04 = ocsp revoked/unknown status
    event linkingStatus(address indexed linked, uint level, byte status);
    event addedEID(address indexed linked, string commonName);

    function emitLinkEvent(address _linked, uint _level, byte _status) {
        onlyIdOracleModifier();
        linkingStatus(_linked, _level, _status);
    }

    event validatingCrtStatus(bytes32 indexed certificateId, uint level, byte status);
    event addedCrt(bytes32 indexed certificateId, string commonName, uint40 indexed serial);

    function emitValidatingEvent(bytes32 _crtId, uint _level, byte _status) {
        onlyWalletOracleModifier();
        validatingCrtStatus(_crtId, _level, _status);
    }

    function addEID(bytes32 _crtHash, address _address, string _commonName, bytes _usrSig)
    external {
        onlyLogicModifier();
        eResident_[_address] = Resident(_crtHash, _usrSig, 1, false);
        addedEID(_address, _commonName);
    }

    function addCrt(bytes32 _crtHash, bytes _bodyHash, string _commonName, bytes _mod, bytes _exp, bytes _crtSig, byte _crtSigAlgo, bytes20 _parentId, uint40 _serial) {
        onlyLogicModifier();
        Certificate memory crt = certificate_[_crtHash];

        if (crt.validated == false) {
            certificate_[_crtHash] =  Certificate(_commonName, PublicKey(_mod, _exp), _crtSig, _crtSigAlgo, _serial, _parentId, false, false, 0, 0, 0, _bodyHash);
            addedCrt(_crtHash, _commonName, _serial);
        }
    }

    /*// has to be separated due to stack limit...
    function addBodyHash(address _address, bytes _hash)
    external
    onlyLogic {
        onlyLogicModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        if (certificate_[crtId].bodyHash.length == 0) {
            certificate_[crtId].bodyHash = _hash;
        }
    }*/

    function appendSHA1BodyHash(address _address, bytes _sha1)
    external {
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        appendSHA1BodyHash(crtId, _sha1);
    }

    function appendSHA1BodyHash(bytes32 _crtId, bytes _sha1)
    public {
        if (msg.sender != connector_.walletOracle_() &&
        msg.sender != connector_.oracle_()) {
            throw;
        }

        // allow overwrite in case computation is invalid, as
        // to not invalidate a cert permanently from db then
        certificate_[_crtId].bodyHash = _sha1;
    }

    function setValidityEID(address _address, uint8 _level)
    external {
        onlyIdOracleModifier();
        uint currentLevel = eResident_[_address].validityLevel;
        if (_level < 5 && _level == currentLevel + 1) {
            eResident_[_address].validityLevel = _level; //initial validation
            if (_level == 2) {
                bytes32 crtId = eResident_[_address].certificateHash;
                certificate_[crtId].validated = true;
            }
        }
        else if (_level == 4 && _level == currentLevel) {
          return; // This is a successful ocsp check, no state changes
        }
        else {
            throw;
        }
    }

    function setCrtValidated(bytes32 _crtId)
    external
    returns (bool) {
        onlyWalletOracleModifier();
        certificate_[_crtId].validated = true;
    }

    function incrementCrtTxNonce(bytes32 _crtId, uint _txNonce)
    external
    returns (bool) {
        onlyWalletOracleModifier();
        if (_txNonce != certificate_[_crtId].txNonce)
            return false;

        certificate_[_crtId].txNonce++;
        return true;
    }

    function ocspUpdateEID(address _address, bool _revoking)
    external
    returns (bool) {
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        return ocspUpdate(crtId, _revoking);
    }

    function ocspUpdateCrt(bytes32 _crtId, bool _revoking)
    external
    returns (bool) {
        onlyWalletOracleModifier();
        return ocspUpdate(_crtId, _revoking);
    }

    function ocspUpdate(bytes32 _crtId, bool _revoking)
    private
    returns (bool) {
        certificate_[_crtId].ocspLastTimestamp = block.timestamp;
        certificate_[_crtId].ocspLastBlock = block.number;
        // DEBUG - Disable for production
        certificate_[_crtId].ocspRevoked = _revoking;
        /*
        if (_revoking == true) {
            revokeCrt(_crtId);
        }
        */
        return true;
    }

    // indicates certificate-wide revocation
    function revokeCrt(bytes32 _crtId)
    private {
        certificate_[_crtId].ocspRevoked = true;
    }

    // revoke only for address
    function selfRevokeEID(address _address)
    external {
        onlyLogicModifier();
        eResident_[_address].userRevoked = true;
        eResident_[_address].validityLevel = 10; // to indicate self revocation
    }
    // in case other contracts fail or get attacked, revocation is still possible
    function selfDirectRevokeEID()
    external {
        if (!isValidatedEID(msg.sender))
            throw;

        eResident_[msg.sender].userRevoked = true;
        eResident_[msg.sender].validityLevel = 10;
    }

    function eResident(address _address)
    external constant
    returns (string commonName, bytes mod, bytes exp, bytes crtSignature, bytes usrSignature, bytes bodyHash, bytes20 parentId, byte sigAlgo) {
        Resident memory res = eResident_[_address];
        (commonName, mod, exp, crtSignature, bodyHash, parentId, sigAlgo) = getCrtDetails(res.certificateHash);
        usrSignature = res.usrSignature;
    }


    function eResidentValidity(address _address)
    external constant
    returns (uint8 validityLevel, bool isRevoked) {
        Resident memory res = eResident_[_address];
        validityLevel = res.validityLevel;
        isRevoked = res.userRevoked || certificate_[res.certificateHash].ocspRevoked;
    }

    function getCrtDetails(bytes32 _crtId)
    public constant
    returns (string commonName, bytes mod, bytes exp, bytes crtSignature, bytes bodyHash, bytes20 parentId, byte sigAlgo) {
        Certificate memory crt = certificate_[_crtId];

        commonName = crt.commonName;
        mod = crt.publicKey.mod;
        exp = crt.publicKey.exp;
        crtSignature = crt.crtSignature;
        sigAlgo = crt.crtSigAlgorithm;
        parentId = crt.parentId;
        bodyHash = crt.bodyHash;
    }

    function getCrtStatus(bytes32 _crtId)
    external constant
    returns(bool valid, bool revoked, uint ocspLastTimestamp, uint ocspLastBlock) {
        Certificate memory crt = certificate_[_crtId];
        valid = crt.validated;
        revoked = crt.ocspRevoked;
        ocspLastTimestamp = crt.ocspLastTimestamp;
        ocspLastBlock = crt.ocspLastBlock;
    }

    function isValidatedEID(address _address)
    public constant
    returns (bool valid) {
        Resident memory res = eResident_[_address];
        if (res.validityLevel == 4 && !res.userRevoked && !certificate_[res.certificateHash].ocspRevoked)
            valid = true;
    }

    function getSerialCrt(bytes32 _crtId)
    external constant
    returns (uint40) {
        return certificate_[_crtId].serialNumber;
    }

    function getCrtTxNonce(bytes32 _crtId)
    external constant
    returns (uint) {
        return certificate_[_crtId].txNonce;
    }

    function getPublicKeyEID(address _address)
    external constant
    returns (bytes mod, bytes exp) {
        bytes32 crtId = eResident_[_address].certificateHash;
        mod = certificate_[crtId].publicKey.mod;
        exp = certificate_[crtId].publicKey.exp;
    }

    function getParentEID(address _address)
    external
    returns (bytes20) {
        bytes32 crtId = eResident_[_address].certificateHash;

        return certificate_[crtId].parentId;
    }

    function pipeHashEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        oracle_.sendPipe(certificate_[crtId].bodyHash);
        return true;
    }

    function pipeCommonNameEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        oracle_.sendPipe(bytes(certificate_[crtId].commonName));
        return true;
    }

    function pipeCrtSigEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        oracle_.sendPipe(certificate_[crtId].crtSignature);
        return true;
    }

    function pipeUsrSigEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        oracle_.sendPipe(eResident_[_address].usrSignature);
        return true;
    }

    function pipeUsrModEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        oracle_.sendPipe(certificate_[crtId].publicKey.mod);
        return true;
    }

    function pipeUsrExpEID(address _address)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        bytes32 crtId = eResident_[_address].certificateHash;
        oracle_.sendPipe(certificate_[crtId].publicKey.exp);
        return true;
    }

    function pipeParentMod(bytes20 _id)
    external
    returns (bool) {
        checkIdOracleModifier();
        onlyIdOracleModifier();
        oracle_.sendPipe(parentCrts_[_id]);
        return true;
    }

    function pipeSigOCSP(bytes _crt, address _requestingOracle)
    external
    checkLogic
    returns (bool) {
        onlyLogicModifier();
        checkIdOracleModifier();
        OraclesPipeAPI(_requestingOracle).sendPipe(_crt);
        return true;
    }
//||||||||||||||||||||||
    function pipeToWalletOracle(bytes32 _crtId, uint _varId)
    returns (bool) {
        onlyWalletOracleModifier();

        Certificate memory crt = certificate_[_crtId];
        bytes memory pipe;

        if (_varId == 1)
            pipe = bytes(crt.commonName);
        else if (_varId == 2)
            pipe = crt.publicKey.mod;
        else if (_varId == 3)
            pipe = crt.publicKey.exp;
        else if (_varId == 4)
            pipe = crt.crtSignature;
        else if (_varId == 5)
            pipe = crt.bodyHash;
        else if (_varId == 6)
            pipe = parentCrts_[crt.parentId];

        if (_varId >= 1 && _varId <= 6) {
            WalletOracle(msg.sender).sendPipe(pipe);
            return true;
        }
    }
}

contract DigitalIdLogic {
    struct PublicKey {
        bytes mod;
        bytes exp;
    }
    // todo add last ocsp check timestamp
    // todo add function to run post ocsp callback optional
    struct Certificate {
        // uint id;
        string commonName;
        PublicKey publicKey;
        bytes signature;
        byte sigAlgorithm; // 05 = sha1, // 0b = sha256
        bytes20 parentId;
        bytes bodyHash;
    }

    //JSON public json_;
    DigitalIdConnector public connector_;
    DigitalIdDatabase public database_;
    DigitalIdOracle public oracle_;

    modifier onlyInterface() { if (msg.sender != connector_.interface_()) throw; _; }
    modifier onlyDatabase() { if (msg.sender != connector_.database_()) throw; _; }
    modifier onlyOracles() { if (msg.sender != connector_.oracle_() && msg.sender != connector_.walletOracle_()) throw; _; }

    modifier onlyWalletOracle() { if (msg.sender != connector_.walletOracle_()) throw; _; }

    modifier checkOracle() {
        if (oracle_ != connector_.oracle_()) {
            oracle_ = DigitalIdOracle(connector_.oracle_());
        }
        _;
    }

    /*modifier checkCrtOracle() {
        if (oracle_ != connector_.crtOracle_()) {
            oracle_ = WalletOracle(connector_.crtOracle_());
        }
        _;
    }*/

    function DigitalIdLogic(address _connector) {
        //OAR = OraclizeAddrResolverI(0x6f485C8BF6fc43eA212E93BBF8ce046C7f1cb475);
        connector_ = DigitalIdConnector(_connector);
        database_ = DigitalIdDatabase(connector_.database_());

    }

    function revocationRequest(address _linked) {
        if (!database_.isValidatedEID(_linked))
            throw;

        database_.selfRevokeEID(_linked);
    }

    function extractCrt(bytes _crt)
    internal returns (Certificate) {
        // uint id;
        bytes memory commonName;
        bytes memory modulus;
        bytes memory exponent;
        bytes20 parentId;
        byte sigAlgorithm; // 05 = sha1, 0b = sha256
        bytes memory signature;
        bytes memory hash;

        (commonName, modulus, exponent, parentId) = extractNameKeyParent(_crt);
        (signature, sigAlgorithm, hash) = extractSigAlgoHash(_crt);

        return Certificate(string(commonName), PublicKey(modulus, exponent), signature, sigAlgorithm, parentId, hash);
    }

    /*function addEID(address _address, string _commonName, bytes _mod, bytes _exp,
    bytes _signature, byte _sigAlgo, bytes20 _parentId, bytes _bodyHash)
    */
    function linkEID(address _linked, bytes _crt, bytes _addressSig)
    external
    payable
    onlyInterface
    checkOracle {
        // address can only have 1 EID ever
        // should be secure enough, but could be avoided by initially providing
        // malformed cert without parentEID, could throw if there's none, or
        // throw if break is passed
        if (database_.getParentEID(_linked) != 0 || _linked == address(0))
            throw;

        bytes32 crtHash = sha3(_crt);
        Certificate memory thisCrt = extractCrt(_crt);

        database_.addCrt(crtHash, thisCrt.sigAlgorithm == 0x05 ? new bytes(0) :
        thisCrt.bodyHash, thisCrt.commonName, thisCrt.publicKey.mod,
        thisCrt.publicKey.exp, thisCrt.signature, thisCrt.sigAlgorithm,
        thisCrt.parentId, parseSerialFromCN(thisCrt.commonName));
        // last argument clears body for SHA-1, to not save 2kb to storage
        database_.addEID(crtHash, _linked, thisCrt.commonName, _addressSig);
        //database_.addBodyHash(_linked, thisCrt.sigAlgorithm == 0x05 ? new bytes(0) : thisCrt.bodyHash);

        oracle_.validateCrt.value(msg.value)(_linked, thisCrt.signature, thisCrt.bodyHash, thisCrt.sigAlgorithm, thisCrt.parentId);
    }

    function addCrtWallet(bytes _crt)
    onlyWalletOracle
    external {
        bytes32 crtHash = sha3(_crt);

        Certificate memory thisCrt = extractCrt(_crt);

        database_.addCrt(crtHash, thisCrt.sigAlgorithm == 0x05 ? new bytes(0) :
        thisCrt.bodyHash, thisCrt.commonName, thisCrt.publicKey.mod,
        thisCrt.publicKey.exp, thisCrt.signature, thisCrt.sigAlgorithm,
        thisCrt.parentId, parseSerialFromCN(thisCrt.commonName));

        /*WalletOracle(msg.sender).processNewCrt(crtHash, _signed, _addressType, _receiverSerial, _receiverAddress, _transferValue, thisCrt.bodyHash, thisCrt.sigAlgorithm);*/
        WalletOracle(msg.sender).processNewCrt(crtHash, thisCrt.bodyHash, thisCrt.signature, thisCrt.sigAlgorithm);

        // last argument clears body for SHA-1, to not save 2kb to storage
        //database_.addBodyHash(_linked, thisCrt.sigAlgorithm == 0x05 ? new bytes(0) : thisCrt.bodyHash);

        //oracle_.validateCrt.value(msg.value)(_linked, thisCrt.signature, thisCrt.bodyHash, thisCrt.sigAlgorithm, thisCrt.parentId);
    }

    // assumes Serial will always be 11 last characters in the common name
    function parseSerialFromCN(string _commonName)
    private
    constant returns (uint40) {
        bytes memory converted = bytes(_commonName);
        uint idIndex = converted.length - 11;
        bytes memory parsed = new bytes(11);
        for(uint i = 0; idIndex < converted.length; i++) {
            parsed[i] = converted[idIndex];
            idIndex++;
        }
        return uint40(oraclizeLib.parseInt(string(parsed)));
    }


    // helpers
    function copyBytes(bytes from, uint fromOffset, uint length, bytes to, uint toOffset)
    private returns (bytes) {

        uint minLength = length + toOffset;

        if (to.length < minLength) {
            // Buffer too small
            assembly {
                add(minLength, toOffset)
                to
                mstore
            }
            bytes memory newSized = new bytes(minLength);
            newSized = to;
            to = newSized;
        }

        // NOTE: the offset 32 is added to skip the `size` field of both bytes variables
        uint i = 32 + fromOffset;
        uint j = 32 + toOffset;

        while (i < (32 + fromOffset + length)) {
            assembly {
                let tmp := mload(add(from, i))
                mstore(add(to, j), tmp)
            }
            i += 32;
            j += 32;
        }

        return to;
    }

    function extractNameKeyParent(bytes _crt)
    private returns (bytes commonName, bytes modulus, bytes exponent, bytes20 parentId) {

        bool skipFirst;
        uint len;

        for (uint i=30; i<_crt.length; i++) {
            if (_crt[i] != 0x30)
                continue;

            if (commonName.length == 0) {
                // check for auth message with i - 3
                if (_crt[i+4] == 0x55 && _crt[i+5] == 0x04
                    && _crt[i+6] == 0x03 && _crt[i+7] == 0x0C) {
                    // skip the first occurrence, which is name of parent cert
                    if (!skipFirst) {
                        skipFirst = true;
                        i += uint(_crt[i+8]) + 8 - 1; //skip this element
                        continue;
                    }
                    len = uint(_crt[i+8]);
                    i += 9;
                    commonName = new bytes(len);
                    commonName = copyBytes(_crt, i, len, commonName, 0);

                    i += len - 1;
                    continue;
                }
            }
            else if (modulus.length == 0) {
                if (_crt[i+4] == 0x02 && _crt[i+5] == 0x82 && _crt[i+6] == 0x01) {

                    i += 8;
                    while(_crt[i] == 0x00)
                        i++;

                    modulus = new bytes(0x20*8);
                    modulus = copyBytes(_crt, i, 0x20*8, modulus, 0);
                    i += 0x20*8 + 1;

                    // get exponent that follows
                    len = uint(_crt[i++]);
                    exponent = new bytes(len);

                    // mask based on indicated length
                    assembly {
                        let tmp := mload(add(_crt, add(i, 0x20)))
                        let trunc := exp(0x10,sub(0x40, mul(len, 2)))
                        div(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, trunc)
                        trunc
                        mul
                        tmp
                        and
                        add(exponent, 0x20)
                        mstore
                    }
                    continue;
                }
            }
            else {
                if (_crt[i+1] == 0x16 && _crt[i+2] == 0x80 && _crt[i+3] == 0x14) {
                    i += 4;
                    // parse for bytes20
                    assembly {
                        let tmp := mload(add(_crt, add(i, 0x20)))
                        and(tmp, 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)
                        =: parentId
                    }
                    break;
                }
            }
        }
    }

    function extractSigAlgoHash(bytes _crt)
    private returns (bytes signature, byte sigAlgorithm, bytes hash) {
                // extract algo and sig + calc hash
        for (uint i = 1; i<_crt.length; i++) {
            if (_crt[i] != 0x30)
                continue;

            uint fromIndex = i;

            uint size = uint(_crt[i+1]) - 0x80;
            // COULD BE bug
            //i += size;
            // replaced with
            i += 2;
            uint seqOffset = 2;
            uint len;
            while (size > 0) {
                len = (len * (0x10 ** 2)) + uint(_crt[i++]);
                size--;
                seqOffset++;
            }

            i += len;

            sigAlgorithm = _crt[i+12];

            hash = getBodyHash(_crt, fromIndex, len, sigAlgorithm, seqOffset);
            // get sig itself
            i += 17;
            len = 0;

            // search until occurrance of null byte in sig
            while (_crt[i] != 0x00) {
                len = (len * (0x10 ** 2)) + uint(_crt[i++]);
            }
            // discount null
            len -= 1;
            signature = new bytes(len);
            signature = copyBytes(_crt, _crt.length - len, len, signature, 0);
            break;

        }
    }

    function getBodyHash(bytes _crt, uint _from, uint _len, byte _algo, uint _offset)
    private returns (bytes) {
        // assign sufficient size so sig is ignored
        // CHANGED was + before but doesn't make sense to me
        // was _len + _from
        // coincidentally this was working only because the correct seqOffset
        // matched with _from
        bytes memory body = new bytes(_len + _offset);
        // offset initial sequence
        body = copyBytes(_crt, _from, body.length, body, 0);
        if (_algo == 0x0b) {
            bytes32 tmp = sha256(body);
            bytes memory hash;
            assembly {
                mstore(hash, 0x20)
                mstore(add(hash, 0x20), tmp)
            }
            return hash;
        }
        else if (_algo == 0x05) {
            // return extracted body, so SHA-1 is done off-chain
            return body;
        }

    }

    function extractCrtOCSP(bytes _crt)
    external
    onlyOracles
    returns (bool ocsp, bytes32 resHash) {

        for (uint i = 0; i < _crt.length; i++) {

            if (_crt[i] != 0x30)
                continue;

            if (_crt[i+1] != 0x09)
                continue;

            // match identifier
            if (_crt[i+2] == 0x06 && _crt[i+3] == 0x05 && _crt[i+4] == 0x2B && _crt[i+5] == 0x0E && _crt[i+6] == 0x03 && _crt[i+7] == 0x02 && _crt[i+8] == 0x1A) {
                uint offset = uint(_crt[i-1]);
                i += offset;

                if(_crt[i] == 0x80 && _crt[i+1] == 0x00)
                    ocsp = true;


                uint lenSize = uint(_crt[35]) - 0x80;
                i = 36;
                uint seqOffset = 2;
                uint len;
                while (lenSize > 0) {
                    len = (len * (0x10 ** 2)) + uint(_crt[i++]);
                    seqOffset++;
                    lenSize--;
                }

                // get body hash of response
                bytes memory body = new bytes(len + seqOffset);

                // offset initial sequence
                body = copyBytes(_crt, 34, len, body, 0);
                resHash = sha256(body);

                // get sig and pipe it to correct oracle
                appendSigOCSP(_crt, 34 + len);
                break;


            }
        }
    }

    function appendSigOCSP(bytes _crt, uint _offset)
    private {
        for (uint i = _offset; i < _crt.length; i++) {

            if (_crt[i] != 0x30)
                continue;

            if (_crt[i+1] != 0x0D)
                continue;

            // match identifier
            if (_crt[i+2] == 0x06 && _crt[i+3] == 0x09 && _crt[i+4] == 0x2A && _crt[i+5] == 0x86 && _crt[i+6] == 0x48 && _crt[i+7] == 0x86 && _crt[i+8] == 0xF7 && _crt[i+9] == 0x0D && _crt[i+10] == 0x01 && _crt[i+11] == 0x01 && _crt[i+12] == 0x0B) {
                i += 20;
                bytes memory signature = new bytes(256);
                signature = copyBytes(_crt, i, 256, signature, 0);

                // use msg.sender to pipe to correct oracle
                database_.pipeSigOCSP(signature, msg.sender);
                break;
            }
        }
    }
}

contract DigitalIdCostEstimator {

    uint24[5] public execCost_ = [
        2000000, // sha1 computation
        2000000, // rsa cert sig validation
        2000000, // rsa addr sig validation (should be same as above)
        2000000, // ocsp query
        1800000 // rsa ocsp response validation
    ];

    function DigitalIdCostEstimator() {
        /*oraclizeLib.oraclize_setProof(0x00);
        oraclizeLib.oraclize_query("URL", "");*/
    }

    function __callback(bytes32 myid, string result) {
        __callback(myid, result, new bytes(0));
    }
    function __callback(bytes32 myid, string result, bytes proof) {
    }

    function getOAR() constant returns (address) {
        return oraclizeLib.getOAR();
    }

    function expectedOracleCosts(bool _sha1)
    public constant returns (uint) {
        //uint estimatedQueryCost = getOracleGasCost("URL", queryGasCost);
        /*uint crtComputationCost = getOracleGasCost("computation", 1800000);

        uint sha1ComputationCost = _sha1 ? getOracleGasCost("computation", 1500000) : 0;
        uint ocspQueryCost = getOracleGasCost("nested", 4000000);
    */
        uint totalCost;

        uint oracleStep = _sha1 ? 0 : 1;

        // load storage array into memory for efficiency
        uint24[5] memory costs = execCost_;
        string memory ds;

        for (; oracleStep < costs.length; oracleStep++) {
            ds = oracleStep == 3 ? "nested" : "computation";
            totalCost += getOracleGasCost(ds, costs[oracleStep]);
        }
        return totalCost;
    }

    function expectedOCSPCosts()
    public constant
    returns (uint) {
        uint totalCost;
        uint24[5] memory costs = execCost_;
        totalCost += getRequestCost(3);
        totalCost += getRequestCost(4);
        return totalCost;
    }

    // General helpers
    function getOracleGasCost(string _type, uint _gasNeeded)
    public constant returns (uint) {
        if (_gasNeeded <= 200000)
            return (oraclizeLib.oraclize_getPrice(_type, 200001) / 200001) * 200000;
        else
            return oraclizeLib.oraclize_getPrice(_type, _gasNeeded);
    }

    function getRequestCost(uint _action)
    public constant returns (uint) {

        string memory ds = _action == 3 ? "nested" : "computation";
        return getOracleGasCost(ds, execCost_[_action]);
    }
}

contract DigitalIdOracle is usingFixedToDynamicLibrary {
    // TODO Add suicides to the 2 logics
    enum cbAction { ComputeHash, ComputeCertSig, ComputeAddrSig, QueryOCSP, ComputeOCSPSig/*, ComputeMsgSig*/ }

    struct Callback {
        address sender;
        cbAction action;
        bool retry;
    }

    struct OCSPRevocation {
        bool pass;
        bytes32 hash;
    }

    mapping (bytes32 => Callback) private cbTracker_;
    mapping (address => bytes32) private cbRetry_;
    //mapping (address => bytes32) private revokingHash_;
    mapping (bytes32 => OCSPRevocation) private cbRevoking_;
    //mapping (bytes32 => OCSPRevocation) private
    //JSON public json_;
    DigitalIdConnector public connector_;
    DigitalIdDatabase public database_;
    DigitalIdLogic public logic_;
    DigitalIdCostEstimator public coster_;

    // work-around for sending dynamic types between contracts
    bytes private pipe_;

    uint24[5] public execCost_ = [
        2000000, // sha1 computation
        2000000, // rsa cert sig validation
        2000000, // rsa addr sig validation (should be same as above)
        2000000, // ocsp query
        1800000 // rsa ocsp response validation
    ];

    modifier onlyLogic() { if (msg.sender != connector_.logic_()) throw; _; }

    modifier onlyInterface() { if (msg.sender != connector_.interface_()) throw; _; }

    modifier onlyDatabase() { if (msg.sender != connector_.database_()) throw; _; }

    function DigitalIdOracle(address _connector) {
        connector_ = DigitalIdConnector(_connector);
        // Database must be pre-deployed already
        database_ = DigitalIdDatabase(connector_.database_());
        coster_ = DigitalIdCostEstimator(connector_.coster_());
        //oraclize_setProof(proofType_NONE);
        //oraclize_query('URL', '');
    }

    function validateCrt(address _linked, bytes _signature, bytes _bodyHash, byte _sigAlgo, bytes20 _parentId)
    external
    onlyLogic
    payable {
        //bytes20 parent = ;

        //bytes memory parentMod = database_.getHashEID(address(0));
        bytes32 callback;
        cbAction action;
        if (_sigAlgo == 0x0b) { // sha-256
            bytes memory parentExp = hex'010001';

            if (database_.pipeParentMod(_parentId))
                bytes memory parentMod = pipe_;
            else
                throw;

            action = cbAction.ComputeCertSig;
            callback = computeRSA(_signature, parentExp, parentMod, execCost_[uint(action)]);

        }
        else if(_sigAlgo == 0x05) { //sha-1
            callback = computeSHA1(_bodyHash);
            action = cbAction.ComputeHash;
        }
        else {
            throw;
        }
        trackCallback(_linked, action, callback);

        uint cost = coster_.expectedOracleCosts(cbTracker_[callback].action == cbAction.ComputeHash);

        if (msg.value < cost)
            throw;

        if (!_linked.send(msg.value - cost))
            throw;
    }

    function trackCallback(address _usr, cbAction _action, bytes32 _cb)
    private {
        cbTracker_[_cb] = Callback(_usr, _action, false);
    }

    function computeRSA(bytes _base, bytes _exp, bytes _mod, uint _cost)
    private
    returns (bytes32 callback) {
        /*string[3] memory params = [oraclizeLib.b2s(_base), oraclizeLib.b2s(_exp), oraclizeLib.b2s(_mod)];
        string[] memory arr;
        arr[0] = oraclizeLib.b2s(_base);
        arr[1] = oraclizeLib.b2s(_exp);
        arr[2] = oraclizeLib.b2s(_mod);*/
        //string[] storage arr = ["Qmd3Vdr5AqFCLDqWhx8fcpQKM6FoUMMieR4cGEyNmL44hJ", base, exp, mod];

        return oraclizeLib.oraclize_query("computation", ["binary(QmfFdnXLRzhiks7BRbJ3UZmc99WVYXwHissHeJSB1sxHw6).unhexlify()",
        oraclizeLib.b2s(_base), oraclizeLib.b2s(_exp), oraclizeLib.b2s(_mod)].toDynamic(), _cost);
    }

    function computeSHA1(bytes _body)
    private
    returns (bytes32 callback) {
        return oraclizeLib.oraclize_query("computation", ["binary(QmeTKU7RYZ4NpxHPKAP4oa6znp7hre1SozBtGa9qvD1L7w).unhexlify()",
        oraclizeLib.b2s(_body)].toDynamic(), execCost_[0]);
    }

    function requestPostOCSPCheck(address _user, address _requester)
    external
    onlyInterface
    payable {
        uint cost = coster_.expectedOCSPCosts();

        if (msg.value < cost)
            throw;

        if (database_.pipeCommonNameEID(_user))
            string memory cn = string(pipe_);
        else
            throw;

        trackCallback(_user, cbAction.QueryOCSP, queryOCSP(cn));

        if (!_requester.send(msg.value - cost))
            throw;
    }

    function queryOCSP(string _cn)
    private
    returns (bytes32 callback) {
        return oraclizeLib.oraclize_query("nested",
        oraclizeLib.strConcat("[URL] http://esteid.oraclize.it/ocsp/_sign?otype=cert&key=${[decrypt] BG+04c4ksqrXd+YyV/AtAXkpfg017wRxBkxcxtKtVHml9VXuEo++koFXVWqKfiAo7TU2KamWspeCzsMSRddOggszdWaSJ5bQUrxw6tBZ9JdfDuvLQiEjJX8EOGd7BGw2LTD04Umk4zU1Fc2iyQzAx2G9ztZXrkF8+1EYoyvDTvlIGT2/PT5lgWWjauYs5iwtrg==}&cn=", _cn), execCost_[3]);
    }

    function verifySigOCSP(bytes _sig)
    private
    returns (bytes32 callback) {
        bytes memory ocspResponderMod = hex'8a1bc6ca1315ae045e1e5b8a967d736ba82f084fe69524449968c91692fd965bee1146683c5232a5803c839bb555f824796e600eadb98c03aae05c977831886bea499f6874a3659cd9a7a9a551bf7a67c69bf8c0f238dec8caf01fc7c026ba9543b73d5f6c52c0911c87f3f677c09f319b79605ea0a8bb4fbc6d5bfa7ea8b41640e708c815f27f8a7241314bea1d2cf7f8f2dfc4edbf4f75b293f73c33d1c832a4de96aca230646059e8625353ac2fd6ab9afddd42b1ecd709babc76b17e97d607d6001697a8f5a62a84f0b156dff3a3635007abf1c994b486c3ab5cbed2c514e83896aab27be56dfd1eacf3c5b511d4bdba23618825f9fce5cf426de9026837';

        return computeRSA(_sig, hex'010001', ocspResponderMod, execCost_[uint(cbAction.ComputeOCSPSig)]);
    }


    function sendPipe(bytes _pipe)
    external
    onlyDatabase {
        pipe_ = _pipe;
    }

    // adds retry flag, allowing query to be re-attempted in case of service failure
    function failedCallback(bytes32 _cb, address _sender)
    private {

        cbTracker_[_cb].retry = true;
        cbRetry_[_sender] = _cb;
    }

    function retryCallback(address _linked)
    external
    onlyInterface
    payable {
        bytes32 cb = cbRetry_[_linked];
        if (cb == 0)
            throw;

        Callback memory cbObj = cbTracker_[cb];
        uint cost = coster_.getRequestCost(uint(cbObj.action));
        // ensure sufficient amount was paid to pay for redoing the Callback
        // IMPORTANT / DANGER check here for potential refund exploits
        if (msg.value < cost)
            throw;

        requestOracleQuery(cb, cbObj, true);
        delete cbRetry_[_linked];

        // IMPORTANT / DANGER check here for potential refund exploits
        if(!_linked.send(msg.value - cost))
            throw;
    }

    function requestOracleQuery(bytes32 _cb, Callback _cbObj, bool _isRetry)
    private {
        requestOracleQuery(_cb, _cbObj, _isRetry, OCSPRevocation(false, 0));
    }

    function requestOracleQuery(bytes32 _cb, Callback _cbObj, bool _isRetry, OCSPRevocation _ocsp)
    private {
        uint nextAction = uint(_cbObj.action);
        nextAction = _isRetry ? nextAction : nextAction + 1;

        bytes memory sig;

        if (nextAction == uint(cbAction.ComputeCertSig)) {
            if (database_.pipeCrtSigEID(_cbObj.sender))
                sig = pipe_;
            else
                throw;

            if (database_.pipeParentMod(database_.getParentEID(_cbObj.sender)))
                bytes memory parentMod = pipe_;
            else
                throw;

            trackCallback(_cbObj.sender, cbAction.ComputeCertSig, computeRSA(sig, hex'010001', parentMod, execCost_[nextAction]));
        }
        else if (nextAction == uint(cbAction.ComputeAddrSig)) {
            if (database_.pipeUsrSigEID(_cbObj.sender))
                sig = pipe_;
            else
                throw;

            if (database_.pipeUsrModEID(_cbObj.sender))
                bytes memory mod = pipe_;
            else
                throw;

            if (database_.pipeUsrExpEID(_cbObj.sender))
                bytes memory exp = pipe_;
            else
                throw;

            trackCallback(_cbObj.sender, cbAction.ComputeAddrSig, computeRSA(sig, exp, mod, execCost_[nextAction]));
        }
        else if (nextAction == uint(cbAction.QueryOCSP)) {
            if (database_.pipeCommonNameEID(_cbObj.sender))
                string memory cn = string(pipe_);
            else
                throw;

            trackCallback(_cbObj.sender, cbAction.QueryOCSP, queryOCSP(cn));
        }
        else if (nextAction == uint(cbAction.ComputeOCSPSig)) {
            // extracted sig already in pipe
            sig = pipe_;
            bytes32 cb = verifySigOCSP(sig);

            //if (_ocsp.hash != 0)
            cbRevoking_[cb] = _ocsp;

            trackCallback(_cbObj.sender, cbAction.ComputeOCSPSig, cb);
        }
        // get storage refund
        delete cbTracker_[_cb].sender;
        delete cbTracker_[_cb].action;

        if (_isRetry)
            delete cbTracker_[_cb].retry;
    }

    function __callback(bytes32 _cb, string _result) {
        if (msg.sender!= oraclizeLib.oraclize_cbAddress()) throw;

        Callback memory cbObj = cbTracker_[_cb];

        if(sha3(_result) == sha3("") || bytes(_result).length == 0) {
            failedCallback(_cb, cbObj.sender);
            database_.emitLinkEvent(cbObj.sender, 0, 0x02);
            return;
        }

        // if retrieved hash is empty, result must be sha1
        if (cbObj.action == cbAction.ComputeHash) {

            bytes memory sha1 = bytes(_result);

            if (sha1.length == 20) {
                database_.appendSHA1BodyHash(cbObj.sender, sha1);
            }
            else {
                database_.emitLinkEvent(cbObj.sender, 1, 0x03);
                return;
            }

            // SHA-1 computed and added, begin cert RSA validation
            requestOracleQuery(_cb, cbObj, false);
            database_.emitLinkEvent(cbObj.sender, 1, 0x01);
            return;
        }

        // runs for initial OCSP callback
        if (cbObj.action == cbAction.QueryOCSP) {
            bool ocspPass;
            bytes32 ocspHash;

            if (logic_ != connector_.logic_()) {
                logic_ = DigitalIdLogic(connector_.logic_());
            }
            // sends extracted sig to pipe, for later use in requestOracleQuery
            (ocspPass, ocspHash) = logic_.extractCrtOCSP(bytes(_result));
            //bytes memory ocspSig = pipe_;
            // check if user's cert passed ocsp
            /*if (!ocspPass)
                revoking_[cbObj.sender] = true;
            else if(revoking_[cbObj.sender] == true)
                delete revoking_[cbObj.sender];
*/
            //database_.appendOCSPHash(cbObj.sender, ocspHash);

            requestOracleQuery(_cb, cbObj, false, OCSPRevocation(ocspPass, ocspHash));
            return;
        }

        bytes memory result = bytes(_result);
        bytes memory hash;

        // throw here so Oraclize is discouraged from providing false results
        // TODO: To be decided, potentially useless as funds will be in this contract anyways
        // also ends up not providing feedback to user
        /*if (result[0] != 0x01)
            throw;
        */

        if (cbObj.action == cbAction.ComputeCertSig) {

            if (database_.pipeHashEID(cbObj.sender))
                hash = pipe_;
            else
                return; //potentially add retry here? although it shouldn't occur, and if it does, it's not retryable anyways

            bytes memory resultHash = new bytes(hash.length);
            resultHash = copyBytes(result, result.length - hash.length, hash.length, resultHash, 0);

            if (sha3(hash) == sha3(resultHash)) {
                database_.setValidityEID(cbObj.sender, 2);

                // initiate address signature validation
                requestOracleQuery(_cb, cbObj, false);
                database_.emitLinkEvent(cbObj.sender, 2, 0x01);
                return;
                // do ocsp
            }
            else {
                database_.emitLinkEvent(cbObj.sender, 2, 0x03);
                return;
            }
        }
        else if (cbObj.action == cbAction.ComputeAddrSig) {
            bytes memory addressHash = new bytes(32);
            addressHash = copyBytes(result, result.length - 32, 32, addressHash, 0);

            if (sha3(sha256(cbObj.sender)) == sha3(addressHash)) {
                database_.setValidityEID(cbObj.sender, 3);
                // initiate OCSP revocation check
                requestOracleQuery(_cb, cbObj, false);
                database_.emitLinkEvent(cbObj.sender, 3, 0x01);
                return;
            }
            else {
                database_.emitLinkEvent(cbObj.sender, 3, 0x03);
                return;
            }
        }
        else if (cbObj.action == cbAction.ComputeOCSPSig) {

            OCSPRevocation memory ocsp = cbRevoking_[_cb];

            bytes memory resultOCSPHash = new bytes(32);
            resultOCSPHash = copyBytes(result, result.length - 32, 32, resultOCSPHash, 0);

            if (sha3(ocsp.hash) == sha3(resultOCSPHash)) {
                if (ocsp.pass == false) {
                    // could be revoked wantonly with a malicious certificate, should track callback too
                    // not any longer, revocation is tied to specific cert used, not last
                    database_.ocspUpdateEID(cbObj.sender, true);
                    database_.emitLinkEvent(cbObj.sender, 4, 0x04);
                    return;
                }
                else {
                    // EID fully validated
                    database_.ocspUpdateEID(cbObj.sender, false);
                    database_.setValidityEID(cbObj.sender, 4);
                    database_.emitLinkEvent(cbObj.sender, 4, 0x01);
                    return;
                }
            }
            else {
                database_.emitLinkEvent(cbObj.sender, 4, 0x03);
                return;
            }
        }
    }

    function copyBytes(bytes from, uint fromOffset, uint length, bytes to, uint toOffset)
    private returns (bytes) {

        uint minLength = length + toOffset;

        if (to.length < minLength) {
            // Buffer too small
            assembly {
                add(minLength, toOffset)
                to
                mstore
            }
            bytes memory newSized = new bytes(minLength);
            newSized = to;
            to = newSized;
        }

        // NOTE: the offset 32 is added to skip the `size` field of both bytes variables
        uint i = 32 + fromOffset;
        uint j = 32 + toOffset;

        while (i < (32 + fromOffset + length)) {
            assembly {
                let tmp := mload(add(from, i))
                mstore(add(to, j), tmp)
            }
            i += 32;
            j += 32;
        }

        return to;
    }
}

contract WalletOracle is usingFixedToDynamicLibrary {

    // to receive oracle funding during testing
    function () payable {

    }

    enum cbAction { ComputeHash, ComputeCertSig, QueryOCSP, ComputeOCSPSig, ComputeSigning }

    enum pipeId { nil, commonName, mod, exp, crtSignature, bodyHash, parentMod }

    struct Callback {
        bytes32 crtId;
        cbAction action;
        bytes32 transferId;
    }

    struct OCSPRevocation {
        bool pass;
        bytes32 hash;
    }

    struct Transfer {
        bytes signature;
        address token;
        bool executed;
        bool transferred;
        bool addressType; // true if type of receiver is address, false if eid
        uint40 senderSerial;
        uint40 receiverSerial;
        address receiverAddress;
        uint value;
        string message;
        uint nonce;
    }

    /*struct TempTransfer {
        bytes signed;
        address token;
        bool addressType;
        uint40 receiverSerial;
        address receiverAddress;
        uint value;
        string message;
        uint nonce;
    }*/

    Transfer private tempTransfer_;

    mapping (bytes32 => Transfer) private transfer_;
    mapping (bytes32 => Callback) private cbTracker_;
    //mapping (address => bytes32) private revokingHash_;
    mapping (bytes32 => OCSPRevocation) private cbRevoking_;
    //mapping (bytes32 => OCSPRevocation) private
    //JSON public json_;
    DigitalIdConnector public connector_;
    DigitalIdDatabase public database_;
    WalletContainer public walletContainer_;

    // work-around for sending dynamic types between contracts
    bytes private pipe_;
/*
    uint24[5] public execCost_ = [
        2000000, // sha1 computation
        1000000, // rsa cert sig validation
        1100000,
        1800000,
        1000000 // rsa msg sig validation (should be same as above)
    ];*/

    function WalletOracle(address _connector, address _wallet) {
        connector_ = DigitalIdConnector(_connector);
        // Database must be pre-deployed already
        database_ = DigitalIdDatabase(connector_.database_());
        walletContainer_ = WalletContainer(_wallet);
        // oraclize_setProof(proofType_NONE);
    }

    function processNewCrt(bytes32 _crtId, bytes _bodyHash, bytes _crtSig, byte _sigAlgo)
    external {
        if (msg.sender != connector_.logic_()) throw;
        //bytes20 parent = ;
        Transfer memory trf = tempTransfer_;

        uint40 senderSerial = database_.getSerialCrt(_crtId);
        bytes32 transferId = sha3(_crtId, trf.signature, trf.addressType, senderSerial, trf.receiverSerial, trf.receiverAddress, trf.value, trf.message, trf.nonce); // transfer struct with exec and transf bools omitted

        transfer_[transferId] = Transfer(trf.signature, trf.token, false, false, trf.addressType, senderSerial, trf.receiverSerial, trf.receiverAddress, trf.value, trf.message, trf.nonce);
        //bytes memory parentMod = database_.getHashEID(address(0));
        bytes32 callback;
        cbAction action;

        oraclizeLib.useCoupon('free');

        if (_sigAlgo == 0x0b) { // sha-256
            bytes memory parentExp = hex'010001';

            if (!database_.pipeToWalletOracle(_crtId, uint(pipeId.parentMod)))
                throw;
            bytes memory parentMod = pipe_;

            action = cbAction.ComputeCertSig;

            callback = idOracleLib.computeRSA(_crtSig, parentExp, parentMod, 2000000);
        }
        else if(_sigAlgo == 0x05) { //sha-1
            callback = idOracleLib.computeSHA1(_bodyHash);
            action = cbAction.ComputeHash;
        }
        else {
            throw;
        }

        Callback memory cbObj = Callback(_crtId, action, transferId);
        trackCallback(cbObj, action, callback);

        // get refund from temp var
        delete tempTransfer_;

        //return transferId;
    }

    function extractNewCrtThenVerifySig(bytes _crt, bytes _signed, address _token, bool _addressType, uint40 _receiverSerial, address _receiverAddress, uint _transferValue, string _message, uint _nonce)
    external
    {
        if (msg.sender != address(walletContainer_)) throw;

        // save to storage for later re-use
        tempTransfer_ = Transfer(_signed, _token, false, false, _addressType, 0, _receiverSerial, _receiverAddress, _transferValue, _message, _nonce);

        // addCrtWallet will be routed to addNewCrt locally
        DigitalIdLogic(connector_.logic_()).addCrtWallet(_crt);


    }


    function requestSigVerify(bytes32 _crtId, bytes _signed, address _token, bool _addressType, uint40 _senderSerial, uint40 _receiverSerial, address _receiverAddress, uint _transferValue, string _message, uint _nonce)
    external {

        if (msg.sender != address(walletContainer_)) throw;
        requestSigVerify(_crtId, Transfer(_signed, _token, false, false, _addressType, _senderSerial, _receiverSerial, _receiverAddress, _transferValue, _message, _nonce));

    }

    // ~400k deployment gas :(
    function requestSigVerify(bytes32 _crtId, Transfer _trf)
    private {
        bytes32 transferId = sha3(_crtId, _trf.signature, _trf.token, _trf.addressType, _trf.senderSerial, _trf.receiverSerial, _trf.receiverAddress, _trf.value, _trf.message, _trf.nonce);

        transfer_[transferId] = _trf;

        // stays in effect, there should be some reset
        oraclizeLib.useCoupon('free');

        // pipe vars needed from database
        if (!database_.pipeToWalletOracle(_crtId, uint(pipeId.mod)))
            throw;
        bytes memory mod = pipe_;

        if (!database_.pipeToWalletOracle(_crtId, uint(pipeId.exp)))
            throw;
        bytes memory exp = pipe_;

        bytes32 cbRSA = idOracleLib.computeRSA(_trf.signature, exp, mod, 2500000);
        Callback memory cbObj = Callback(_crtId, cbAction.ComputeSigning, transferId);
        trackCallback(cbObj, cbAction.ComputeSigning, cbRSA);
    }

    function trackCallback(Callback _prevCbObj, cbAction _action, bytes32 _cb)
    private {
        cbTracker_[_cb] = Callback(_prevCbObj.crtId, _action, _prevCbObj.transferId);
    }

    function sendPipe(bytes _pipe)
    external {
        if (msg.sender != address(database_))
            throw;
        pipe_ = _pipe;
    }

    function requestOracleQuery(Callback _cbObj)
    private {
        requestOracleQuery(_cbObj, OCSPRevocation(false, 0));
    }

    function requestOracleQuery(Callback _cbObj, OCSPRevocation _ocsp)
    private {
        uint nextAction = uint(_cbObj.action);
        nextAction = nextAction + 1;

        bytes memory sig;

        if (nextAction == uint(cbAction.ComputeCertSig)) {
            if (!database_.pipeToWalletOracle(_cbObj.crtId, uint(pipeId.crtSignature)))
                throw;
            sig = pipe_;

            if (!database_.pipeToWalletOracle(_cbObj.crtId, uint(pipeId.parentMod)))
                throw;
            bytes memory parentMod = pipe_;

            trackCallback(_cbObj, cbAction.ComputeCertSig, idOracleLib.computeRSA(sig, hex'010001', parentMod, 1000000));
        }
        else if (nextAction == uint(cbAction.QueryOCSP)) {
            if (!database_.pipeToWalletOracle(_cbObj.crtId, uint(pipeId.commonName)))
                throw;
            string memory cn = string(pipe_);

            trackCallback(_cbObj, cbAction.QueryOCSP, idOracleLib.queryOCSP(cn));
        }
        else if (nextAction == uint(cbAction.ComputeOCSPSig)) {
        // verify the provided signature with known valid ocsp cert
            // extracted sig already in pipe
            sig = pipe_;
            bytes32 cb = idOracleLib.verifySigOCSP(sig);

            //if (_ocsp.hash != 0)
            cbRevoking_[cb] = _ocsp;

            trackCallback(_cbObj, cbAction.ComputeOCSPSig, cb);
        }
        else if (nextAction == uint(cbAction.ComputeSigning)) {
            // should do address to hash translation
            // needs to be handled somehow :/, accessing wallet?
            sig = transfer_[_cbObj.transferId].signature;


            if (!database_.pipeToWalletOracle(_cbObj.crtId, uint(pipeId.mod)))
                throw;
            bytes memory mod = pipe_;

            if (!database_.pipeToWalletOracle(_cbObj.crtId, uint(pipeId.exp)))
                throw;
            bytes memory exp = pipe_;

            trackCallback(_cbObj, cbAction.ComputeSigning, idOracleLib.computeRSA(sig, exp, mod, 1000000));
        }


        // get storage refund
        /*delete cbTracker_[_cb].crtId;
        delete cbTracker_[_cb].action;*/
    }

    function __callback(bytes32 _cb, string _result) {
        if (msg.sender != oraclizeLib.oraclize_cbAddress()) throw;

        Callback memory cbObj = cbTracker_[_cb];

        if(sha3(_result) == sha3("") || bytes(_result).length == 0) {
            //failedCallback(_cb, cbObj.crtId);
            database_.emitValidatingEvent(cbObj.crtId, 0, 0x02);
            return;
        }

        // if retrieved hash is empty, result must be sha1
        if (cbObj.action == cbAction.ComputeHash) {

            bytes memory sha1 = bytes(_result);

            if (sha1.length == 20) {
                database_.appendSHA1BodyHash(cbObj.crtId, sha1);
            }
            else {
                database_.emitValidatingEvent(cbObj.crtId, 1, 0x03);
                return;
            }

            // SHA-1 computed and added, begin cert RSA validation
            requestOracleQuery(cbObj);
            database_.emitValidatingEvent(cbObj.crtId, 1, 0x01);
            return;
        }

        // runs for initial OCSP callback
        if (cbObj.action == cbAction.QueryOCSP) {
            bool ocspPass;
            bytes32 ocspHash;

            DigitalIdLogic logic = DigitalIdLogic(connector_.logic_());

            // sends extracted sig to pipe, for later use in requestOracleQuery
            (ocspPass, ocspHash) = logic.extractCrtOCSP(bytes(_result));
            //bytes memory ocspSig = pipe_;
            // check if user's cert passed ocsp

            //database_.appendOCSPHash(cbObj.sender, ocspHash);

            requestOracleQuery(cbObj, OCSPRevocation(ocspPass, ocspHash));
            return;
        }

        bytes memory result = bytes(_result);

        // throw here so Oraclize is discouraged from providing false results
        // TODO: To be decided, potentially useless as funds will be in this contract anyways
        // also ends up not providing feedback to user

        if (cbObj.action == cbAction.ComputeCertSig) {
            bytes memory expectHash;

            if (!database_.pipeToWalletOracle(cbObj.crtId, uint(pipeId.bodyHash)))
                throw;
            expectHash = pipe_;

            // expectHash length is dependent upon sigAlgo, hence just base it off the state's expectHash
            bytes memory resultHash = new bytes(expectHash.length);
            resultHash = copyBytes(result, result.length - expectHash.length, expectHash.length, resultHash, 0);

            if (sha3(expectHash) == sha3(resultHash)) {
                database_.setCrtValidated(cbObj.crtId);
                // initiate address signature validation
                requestOracleQuery(cbObj);
                database_.emitValidatingEvent(cbObj.crtId, 2, 0x01);
                return;
            }
            else {
                database_.emitValidatingEvent(cbObj.crtId, 2, 0x03);
                return;
            }
        }
        else if (cbObj.action == cbAction.ComputeOCSPSig) {

            OCSPRevocation memory ocsp = cbRevoking_[_cb];

            bytes memory resultOCSPHash = new bytes(32);
            resultOCSPHash = copyBytes(result, result.length - 32, 32, resultOCSPHash, 0);

            if (sha3(ocsp.hash) == sha3(resultOCSPHash)) {
                if (ocsp.pass == false) {
                    // could be revoked wantonly with a malicious certificate, should track callback too
                    // not any longer, revocation is tied to specific cert used, not last
                    database_.ocspUpdateCrt(cbObj.crtId, true);
                    database_.emitValidatingEvent(cbObj.crtId, 3, 0x04);
                    return;
                }
                else {
                    // Crt passed OCSP check
                    database_.ocspUpdateCrt(cbObj.crtId, false);
                    requestOracleQuery(cbObj);
                    database_.emitValidatingEvent(cbObj.crtId, 3, 0x01);
                    return;
                }
            }
            else {
                database_.emitValidatingEvent(cbObj.crtId, 3, 0x03);
                return;
            }
        }
        else if (cbObj.action == cbAction.ComputeSigning) {
            // should likely be last step, after ocsp checks complete
            bytes memory signedHash = new bytes(32);
            signedHash = copyBytes(result, result.length - 32, 32, signedHash, 0);

            Transfer memory tfr = transfer_[cbObj.transferId];

            if (sha3(
                    tfr.addressType ?
                    sha256(tfr.receiverAddress, tfr.token, tfr.value, tfr.message, tfr.nonce) :
                    sha256(tfr.receiverSerial, tfr.token, tfr.value, tfr.message, tfr.nonce)
                )
                == sha3(signedHash)
                )
            {
                // call wallet here and execute transfer;


                // ensure nonce is current
                if (database_.incrementCrtTxNonce(cbObj.crtId, tfr.nonce)) {
                    walletContainer_.executeDelegatedTransfer(tfr.senderSerial, tfr.addressType, tfr.receiverSerial, tfr.receiverAddress, tfr.token, tfr.value, tfr.message);
                    database_.emitValidatingEvent(cbObj.crtId, 4, 0x01);
                } else {
                    database_.emitValidatingEvent(cbObj.crtId, 4, 0x04);
                }
                return;
            }
            else {
                database_.emitValidatingEvent(cbObj.crtId, 4, 0x03);
                return;
            }
        }
    }

    function copyBytes(bytes from, uint fromOffset, uint length, bytes to, uint toOffset)
    private returns (bytes) {

        uint minLength = length + toOffset;

        if (to.length < minLength) {
            // Buffer too small
            assembly {
                add(minLength, toOffset)
                to
                mstore
            }
            bytes memory newSized = new bytes(minLength);
            newSized = to;
            to = newSized;
        }

        // NOTE: the offset 32 is added to skip the `size` field of both bytes variables
        uint i = 32 + fromOffset;
        uint j = 32 + toOffset;

        while (i < (32 + fromOffset + length)) {
            assembly {
                let tmp := mload(add(from, i))
                mstore(add(to, j), tmp)
            }
            i += 32;
            j += 32;
        }

        return to;
    }
}

// math.sol -- mixin for inline numerical wizardry

// Copyright (C) 2015, 2016, 2017  DappHub, LLC

// Licensed under the Apache License, Version 2.0 (the "License").
// You may not use this file except in compliance with the License.

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND (express or implied).

contract DSMath {
    function assert(bool assertion) internal {
        if (!assertion) throw;
    }
    /*
    standard uint256 functions
     */

    function add(uint256 x, uint256 y) constant internal returns (uint256 z) {
        assert((z = x + y) >= x);
    }

    function sub(uint256 x, uint256 y) constant internal returns (uint256 z) {
        assert((z = x - y) <= x);
    }

    function mul(uint256 x, uint256 y) constant internal returns (uint256 z) {
        assert((z = x * y) >= x);
    }

    function div(uint256 x, uint256 y) constant internal returns (uint256 z) {
        z = x / y;
    }

    function min(uint256 x, uint256 y) constant internal returns (uint256 z) {
        return x <= y ? x : y;
    }
    function max(uint256 x, uint256 y) constant internal returns (uint256 z) {
        return x >= y ? x : y;
    }

    /*
    uint128 functions (h is for half)
     */


    function hadd(uint128 x, uint128 y) constant internal returns (uint128 z) {
        assert((z = x + y) >= x);
    }

    function hsub(uint128 x, uint128 y) constant internal returns (uint128 z) {
        assert((z = x - y) <= x);
    }

    function hmul(uint128 x, uint128 y) constant internal returns (uint128 z) {
        assert((z = x * y) >= x);
    }

    function hdiv(uint128 x, uint128 y) constant internal returns (uint128 z) {
        z = x / y;
    }

    function hmin(uint128 x, uint128 y) constant internal returns (uint128 z) {
        return x <= y ? x : y;
    }
    function hmax(uint128 x, uint128 y) constant internal returns (uint128 z) {
        return x >= y ? x : y;
    }


    /*
    int256 functions
     */

    function imin(int256 x, int256 y) constant internal returns (int256 z) {
        return x <= y ? x : y;
    }
    function imax(int256 x, int256 y) constant internal returns (int256 z) {
        return x >= y ? x : y;
    }

    /*
    WAD math
     */

    uint128 constant WAD = 10 ** 18;

    function wadd(uint128 x, uint128 y) constant internal returns (uint128) {
        return hadd(x, y);
    }

    function wsub(uint128 x, uint128 y) constant internal returns (uint128) {
        return hsub(x, y);
    }

    function wmul(uint128 x, uint128 y) constant internal returns (uint128 z) {
        z = cast((uint256(x) * y + WAD / 2) / WAD);
    }

    function wdiv(uint128 x, uint128 y) constant internal returns (uint128 z) {
        z = cast((uint256(x) * WAD + y / 2) / y);
    }

    function wmin(uint128 x, uint128 y) constant internal returns (uint128) {
        return hmin(x, y);
    }
    function wmax(uint128 x, uint128 y) constant internal returns (uint128) {
        return hmax(x, y);
    }

    /*
    RAY math
     */

    uint128 constant RAY = 10 ** 27;

    function radd(uint128 x, uint128 y) constant internal returns (uint128) {
        return hadd(x, y);
    }

    function rsub(uint128 x, uint128 y) constant internal returns (uint128) {
        return hsub(x, y);
    }

    function rmul(uint128 x, uint128 y) constant internal returns (uint128 z) {
        z = cast((uint256(x) * y + RAY / 2) / RAY);
    }

    function rdiv(uint128 x, uint128 y) constant internal returns (uint128 z) {
        z = cast((uint256(x) * RAY + y / 2) / y);
    }

    function rpow(uint128 x, uint64 n) constant internal returns (uint128 z) {
        // This famous algorithm is called "exponentiation by squaring"
        // and calculates x^n with x as fixed-point and n as regular unsigned.
        //
        // It's O(log n), instead of O(n) for naive repeated multiplication.
        //
        // These facts are why it works:
        //
        //  If n is even, then x^n = (x^2)^(n/2).
        //  If n is odd,  then x^n = x * x^(n-1),
        //   and applying the equation for even x gives
        //    x^n = x * (x^2)^((n-1) / 2).
        //
        //  Also, EVM division is flooring and
        //    floor[(n-1) / 2] = floor[n / 2].

        z = n % 2 != 0 ? x : RAY;

        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);

            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }

    function rmin(uint128 x, uint128 y) constant internal returns (uint128) {
        return hmin(x, y);
    }
    function rmax(uint128 x, uint128 y) constant internal returns (uint128) {
        return hmax(x, y);
    }

    function cast(uint256 x) constant internal returns (uint128 z) {
        assert((z = uint128(x)) == x);
    }

}

contract Token {
  /// @return total amount of tokens
  function totalSupply() constant returns (uint256 supply) {}

  /// @param _owner The address from which the balance will be retrieved
  /// @return The balance
  function balanceOf(address _owner) constant returns (uint256 balance) {}

  /// @notice send `_value` token to `_to` from `msg.sender`
  /// @param _to The address of the recipient
  /// @param _value The amount of token to be transferred
  /// @return Whether the transfer was successful or not
  function transfer(address _to, uint256 _value) returns (bool success) {}

  /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
  /// @param _from The address of the sender
  /// @param _to The address of the recipient
  /// @param _value The amount of token to be transferred
  /// @return Whether the transfer was successful or not
  function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {}

  /// @notice `msg.sender` approves `_addr` to spend `_value` tokens
  /// @param _spender The address of the account able to transfer the tokens
  /// @param _value The amount of wei to be approved for transfer
  /// @return Whether the approval was successful or not
  function approve(address _spender, uint256 _value) returns (bool success) {}

  /// @param _owner The address of the account owning tokens
  /// @param _spender The address of the account able to transfer the tokens
  /// @return Amount of remaining tokens allowed to spent
  function allowance(address _owner, address _spender) constant returns (uint256 remaining) {}

  event Transfer(address indexed _from, address indexed _to, uint256 _value);
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  uint public decimals;
  string public name;
}

// handle ocsp revocation on poi-side
contract WalletContainer is DSMath {
    struct Balance {
        uint eth;
        mapping(address => uint) token;
    }

    struct Transfer {
      bytes signed;
      address token;
      bool addressType;
      uint40 receiverSerial;
      address receiverAddress;
      uint value;
      string message;
      uint nonce;
    }

    Transfer transfer_;
    mapping(uint40 => Balance) public balances_;

    event LOG_receivedTransfer(uint40 indexed receiverSerial, uint40 senderSerial, address senderAddress, address indexed token, uint amount, string note, uint time);
    event LOG_sentTransfer(uint40 indexed senderSerial, uint40 receiverSerial, address receiverAddress, address indexed token, uint amount, string note, uint time);
    event LOG_balanceUpdate(uint40 indexed serial, address indexed token, uint amount, uint time);

    DigitalIdConnector public connector_;
    DigitalIdDatabase public database_;
    WalletOracle public walletOracle_;

    uint public birthBlock_;

    modifier checkWalletOracle() {
        if (walletOracle_ != connector_.walletOracle_()) {
            walletOracle_ = WalletOracle(connector_.walletOracle_());
        }
        _;
    }

    // assumes all EID serials are and will be 11 digits
    modifier serialCheck(uint40 _serial) {
        if (_serial > 99999999999 || _serial < 10000000000)
            throw;

        _;
    }

    // connect to oracle here and db
    function WalletContainer(address _connector) {
        connector_ = DigitalIdConnector(_connector);
        database_ = DigitalIdDatabase(connector_.database_());
        birthBlock_ = block.number;
    }

    function getBalance(uint40 _serial)
    public
    constant
    returns (uint) {
        return getBalance(_serial, 0);
    }

    function getBalance(uint40 _serial, address _token)
    public
    constant
    returns (uint) {
        if (_token == 0)
            return balances_[_serial].eth;
        else
            return balances_[_serial].token[_token];
    }

    function sendEtherToEID(uint40 _serial)
    payable
    external
    returns (bool success) {
        success = sendEtherToEID(_serial, '');
    }

    function sendEtherToEID(uint40 _serial, string _msg)
    payable
    serialCheck(_serial)
    public
    returns (bool success) {
        balances_[_serial].eth = add(msg.value, balances_[_serial].eth);

        LOG_receivedTransfer(_serial, 0, msg.sender, 0, msg.value, _msg, now);
        success = true;
        LOG_balanceUpdate(_serial, 0, balances_[_serial].eth, now);
    }

    function sendTokensToEID(uint40 _serial, address _token, uint _amount)
    external
    returns (bool success) {
        // may be reserved for ether down the line?
        success = sendTokensToEID(_serial, _token, _amount, '');
        //balances_[_serial] = add()
    }

    function sendTokensToEID(uint40 _serial, address _token, uint _amount, string _msg)
    serialCheck(_serial)
    public
    returns (bool success) {
        // may be reserved for ether down the line?
        if (_token == 0)
            throw;

        if (!Token(_token).transferFrom(msg.sender, this, _amount))
            throw;

        balances_[_serial].token[_token] = add(_amount, balances_[_serial].token[_token]);

        LOG_receivedTransfer(_serial, 0, msg.sender, _token, _amount, _msg, now);
        success = true;
        LOG_balanceUpdate(_serial, _token, balances_[_serial].token[_token], now);
    }

    function transferEtherToAddress(bytes _crt, bytes _signed, address _signedReceiverAddress, uint _signedValue, string _signedMessage, uint _signedNonce)
    external {
        Transfer memory trf = Transfer(_signed, 0, true, 0, _signedReceiverAddress, _signedValue, _signedMessage, _signedNonce);
        requestTransferToOracle(_crt, trf);
    }

    function transferTokenToAddress(bytes _crt, bytes _signed, address _signedToken, address _signedReceiverAddress, uint _signedValue, string _signedMessage, uint _signedNonce)
    external {
        Transfer memory trf = Transfer(_signed, _signedToken, true, 0, _signedReceiverAddress, _signedValue, _signedMessage, _signedNonce);
        requestTransferToOracle(_crt, trf);
    }


    function transferEtherToSerial(bytes _crt, bytes _signed, uint40 _signedReceiverSerial, uint _signedValue, string _signedMessage, uint _signedNonce)
    serialCheck(_signedReceiverSerial)
    external {
        Transfer memory trf = Transfer(_signed, 0, false, _signedReceiverSerial, 0, _signedValue, _signedMessage, _signedNonce);
        requestTransferToOracle(_crt, trf);
    }

    function transferTokenToSerial(bytes _crt, bytes _signed, address _signedToken, uint40 _signedReceiverSerial, uint _signedValue, string _signedMessage, uint _signedNonce)
    serialCheck(_signedReceiverSerial)
    external {
        Transfer memory trf = Transfer(_signed, _signedToken, false, _signedReceiverSerial, 0, _signedValue, _signedMessage, _signedNonce);
        requestTransferToOracle(_crt, trf);
    }

    function requestTransferToOracle(bytes _crt, Transfer _trf)
    private {

        // send cert and sig to be verified
        // check if crt is already in database
        bytes32 crtId = sha3(_crt);

        // maybe check at end post-increment?!
        // CURRENTLY ALLOWS ONLY FOR ONE TX AT A TIME AND NOT QEUEING SEVERAL
        if (database_.getCrtTxNonce(crtId) != _trf.nonce)
            throw;

        bool valid;
        bool revoked;
        uint ocspLastTimestamp;
        uint ocspLastBlock;

        (valid, revoked, ocspLastTimestamp, ocspLastBlock) = database_.getCrtStatus(crtId);

        if(revoked) {
            //DEBUG don't throw if revoked
            //throw;
            onlyTrfSigValidation(_crt, crtId, _trf);
        }
        else if(valid && ocspLastTimestamp > 0) {
            onlyTrfSigValidation(_crt, crtId, _trf);
        }
        else {
            fullCrtValidation(_crt, _trf);
        }
    }

    function onlyTrfSigValidation(bytes _crt, bytes32 _crtId, Transfer _trf)
    checkWalletOracle
    private {
        // check here if there's even sufficient balance, so not to waste computing resources
        if (!sufficientBalance(database_.getSerialCrt(_crtId), _trf.token, _trf.value))
            throw;

        // TODO
        // periodic ocsp check or ocsp check above certain amounts!?
        walletOracle_.requestSigVerify(_crtId, _trf.signed, _trf.token, _trf.addressType, database_.getSerialCrt(_crtId), _trf.receiverSerial, _trf.receiverAddress, _trf.value, _trf.message, _trf.nonce);
    }

    function fullCrtValidation(bytes _crt, Transfer _trf)
    checkWalletOracle
    private {

        // schedule for trf sig validation
        walletOracle_.extractNewCrtThenVerifySig(_crt, _trf.signed, _trf.token, _trf.addressType, _trf.receiverSerial, _trf.receiverAddress, _trf.value, _trf.message, _trf.nonce);
    }

    function sufficientBalance(uint40 _serial, address _token, uint _value)
    private
    constant
    returns (bool) {
        if (_token == 0)
            return balances_[_serial].eth >= _value;
        else
            return balances_[_serial].token[_token] >= _value;

    }

    function executeDelegatedTransfer(uint40 _senderSerial, bool _addressType, uint40 _receiverSerial, address _receiverAddress, address _token, uint _value, string _msg)
    external
    returns (bool transferred) {
        // only allow current walletOracle to execute the transfer
        if(msg.sender != connector_.walletOracle_())
            throw;

        if(_addressType) {
            if(_token == 0) {
                return executeAddressTransferETH(_senderSerial, _receiverAddress, _value, _msg);
            }
            else {
                return executeAddressTransferToken(_senderSerial, _receiverAddress, _token, _value, _msg);
            }
        }
        else {
            if(_token == 0) {
                return executeSerialTransferETH(_senderSerial, _receiverSerial, _value, _msg);
            }
            else {
                return executeSerialTransferToken(_senderSerial, _receiverSerial, _token, _value, _msg);
            }
        }
    }

    function executeAddressTransferETH(uint40 _senderSerial, address _receiverAddress, uint _value, string _msg)
    private
    returns (bool transferred) {
        if (balances_[_senderSerial].eth >= _value) {
            // underflow check
            balances_[_senderSerial].eth = sub(balances_[_senderSerial].eth, _value);
            if(!_receiverAddress.send(_value)) {
                return false;
            }
            // emit event here
            LOG_sentTransfer(_senderSerial, 0, _receiverAddress, 0, _value, _msg, now);
            LOG_balanceUpdate(_senderSerial, 0, balances_[_senderSerial].eth, now);
            return true;
        }
        else {
            // emit event here
            return false;
        }
    }

    function executeAddressTransferToken(uint40 _senderSerial, address _receiverAddress, address _token, uint _value, string _msg)
    private
    returns (bool transferred) {
        if (balances_[_senderSerial].token[_token] >= _value) {
            // underflow check
            balances_[_senderSerial].token[_token] = sub(balances_[_senderSerial].token[_token], _value);
            if(!Token(_token).transfer(_receiverAddress, _value)) {
                return false;
            }
             // emit event here
            LOG_sentTransfer(_senderSerial, 0, _receiverAddress, _token, _value, _msg, now);
            LOG_balanceUpdate(_senderSerial, _token, balances_[_senderSerial].token[_token], now);
            return true;
        }
        else {
            // emit event here
            return false;
        }
    }

    function getHashForTransfer(uint40 _serialReceiver, address _token, uint _value, string _msg, uint _nonce)
    public
    constant
    returns (bytes32 hash) {
        // address 0 is considered ether tokens
        hash = sha256(_serialReceiver, _token, _value, _msg, _nonce);
    }

    function getHashForTransfer(address _addressReceiver, address _token, uint _value, string _msg, uint _nonce)
    public
    constant
    returns (bytes32 hash) {
        hash = sha256(_addressReceiver, _token, _value, _msg, _nonce);
    }

    function executeSerialTransferETH(uint40 _senderSerial, uint40 _receiverSerial, uint _value, string _msg)
    private
    returns (bool transferred) {
        if (balances_[_senderSerial].eth >= _value) {
            balances_[_senderSerial].eth = sub(balances_[_senderSerial].eth, _value); // add underflow/overflow checks
            balances_[_receiverSerial].eth = add(balances_[_receiverSerial].eth, _value);
             // emit event here
            LOG_sentTransfer(_senderSerial, _receiverSerial, 0, 0, _value, _msg, now);
            LOG_balanceUpdate(_senderSerial, 0, balances_[_senderSerial].eth, now);
            LOG_receivedTransfer(_receiverSerial, _senderSerial, 0, 0, _value, _msg, now);
            LOG_balanceUpdate(_receiverSerial, 0, balances_[_receiverSerial].eth, now);
            return true;
        }
        else {
            // emit event here
            return false;
        }
    }

    function executeSerialTransferToken(uint40 _senderSerial, uint40 _receiverSerial, address _token, uint _value, string _msg)
    private
    returns (bool transferred) {
        if (balances_[_senderSerial].token[_token] >= _value) {
            // remove balance from sender
            balances_[_senderSerial].token[_token] = sub(balances_[_senderSerial].token[_token], _value);

            // add balance towards receiver
            balances_[_receiverSerial].token[_token] = add(balances_[_receiverSerial].token[_token], _value);

             // emit event here
            LOG_sentTransfer(_senderSerial, _receiverSerial, 0, _token, _value, _msg, now);
            LOG_balanceUpdate(_senderSerial, _token, balances_[_senderSerial].token[_token], now);
            LOG_receivedTransfer(_receiverSerial, _senderSerial, 0, _token, _value, _msg, now);
            LOG_balanceUpdate(_receiverSerial, _token, balances_[_receiverSerial].token[_token], now);
            return true;
        }
        else {
            // emit event here
            return false;
        }
    }
}
