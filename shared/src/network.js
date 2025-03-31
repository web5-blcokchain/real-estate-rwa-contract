const { ethers } = require('ethers');
require('dotenv').config();

class NetworkConfig {
  constructor() {
    this.networkType = process.env.NETWORK_TYPE || 'hardhat';
    this.rpcUrl = this.getRpcUrl();
    this.chainId = this.getChainId();
  }

  getRpcUrl() {
    switch (this.networkType) {
      case 'testnet':
        return process.env.TESTNET_RPC_URL;
      case 'mainnet':
        return process.env.MAINNET_RPC_URL;
      case 'hardhat':
      default:
        return 'http://127.0.0.1:8545';
    }
  }

  getChainId() {
    switch (this.networkType) {
      case 'testnet':
        return 97; // BSC Testnet
      case 'mainnet':
        return 56; // BSC Mainnet
      case 'hardhat':
      default:
        return 31337;
    }
  }

  getProvider() {
    return new ethers.JsonRpcProvider(this.rpcUrl);
  }

  getSigner(privateKey) {
    const provider = this.getProvider();
    return new ethers.Wallet(privateKey, provider);
  }

  getGasConfig() {
    return {
      gasLimit: parseInt(process.env.GAS_LIMIT || '3000000'),
      gasPrice: ethers.parseUnits(process.env.GAS_PRICE || '5000000000', 'wei'),
    };
  }
}

module.exports = new NetworkConfig(); 