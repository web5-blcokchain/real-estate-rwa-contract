/**
 * Hardhat本地网络配置
 */
module.exports = {
  name: 'Hardhat Local',
  chainId: 31337,
  rpcUrl: 'http://127.0.0.1:8545',
  explorerUrl: '',
  gasPrice: 50000000000, // 50 gwei
  gasLimit: 6000000,
  confirmations: 1,
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  defaults: {
    gasPrice: 50000000000, // 50 gwei
    gasLimit: 6000000,
    confirmations: 1
  }
}; 