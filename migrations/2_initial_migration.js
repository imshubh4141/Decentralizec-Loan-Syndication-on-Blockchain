const SyndicateLoan = artifacts.require("SyndicateLoan");

module.exports = function (deployer) {
  deployer.deploy(SyndicateLoan);
};
