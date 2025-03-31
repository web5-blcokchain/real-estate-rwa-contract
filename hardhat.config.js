require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");

const envConfig = require("./shared/src/config/env");
envConfig.load();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: envConfig.getNetworkConfig(),
  etherscan: envConfig.getEtherscanConfig(),
  gasReporter: envConfig.getGasReporterConfig(),
  paths: envConfig.getPathsConfig(),
  mocha: envConfig.getMochaConfig(),
};