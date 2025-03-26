/**
 * BSC测试网络配置
 */
module.exports = {
  // BSC测试网RPC URL
  rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
  
  // BSC测试网链ID
  chainId: 97,
  
  // BSC测试网区块浏览器
  explorerUrl: 'https://testnet.bscscan.com',
  
  // 网络名称
  name: 'BSC Testnet',
  
  // 原生代币符号
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  
  // 区块确认数
  confirmations: 1,
  
  // 默认Gas限制
  defaultGasLimit: 3000000,
  
  // 默认Gas价格 (Gwei)
  defaultGasPrice: 10
}; 