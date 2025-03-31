require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  ETHERSCAN_API_KEY,
  ETHERSCAN_API_URL,
  ETHERSCAN_BROWSER_URL,
  HARDHAT_CHAIN_ID,
  TESTNET_CHAIN_ID,
  MAINNET_CHAIN_ID,
  DEPLOYER_PRIVATE_KEY,
  HARDHAT_RPC_URL,
  TESTNET_RPC_URL,
  MAINNET_RPC_URL
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      url: HARDHAT_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: parseInt(HARDHAT_CHAIN_ID),
      blockGasLimit: 30000000,
      gas: "auto",
      gasPrice: "auto",
      allowUnlimitedContractSize: false,
      loggingEnabled: false
    },
    testnet: {
      url: TESTNET_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: parseInt(TESTNET_CHAIN_ID),
      gas: "auto",
      gasPrice: "auto"
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts: [DEPLOYER_PRIVATE_KEY],
      chainId: parseInt(MAINNET_CHAIN_ID),
      gas: "auto",
      gasPrice: "auto"
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "testnet",
        chainId: parseInt(TESTNET_CHAIN_ID),
        urls: {
          apiURL: ETHERSCAN_API_URL,
          browserURL: ETHERSCAN_BROWSER_URL
        }
      },
      {
        network: "mainnet",
        chainId: parseInt(MAINNET_CHAIN_ID),
        urls: {
          apiURL: ETHERSCAN_API_URL,
          browserURL: ETHERSCAN_BROWSER_URL
        }
      }
    ]
  }
};