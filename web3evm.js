exports.extend = function (web3) {
  //TODO: Integrate evm_mine here, so one does not have to use archaic sendtx to initiate a mined block.
  web3._extend({
    property: 'evm',
    methods: [new web3._extend.Method({
      name: 'snapshot',
      call: 'evm_snapshot',
      params: 0,
      outputFormatter: toIntVal
    })]
  });

  web3._extend({
    property: 'evm',
    methods: [new web3._extend.Method({
      name: 'revert',
      call: 'evm_revert',
      params: 1,
      inputFormatter: [toIntVal]
    })]
  });

  web3._extend({
    property: 'evm',
    methods: [new web3._extend.Method({
      name: 'increaseTime',
      call: 'evm_increaseTime',
      params: 1,
      inputFormatter: [toIntVal],
      outputFormatter: toIntVal
    })]
  });


  function toIntVal(val) {
    return parseInt(val);
  }

  return web3;

};
