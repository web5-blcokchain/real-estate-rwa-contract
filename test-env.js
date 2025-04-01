/**
 * 测试环境配置加载
 * 此脚本验证根目录.env文件的配置是否正确加载
 */

// 导入配置模块
const envConfig = require('./shared/src/config/env');
const networkConfig = require('./shared/src/config/network');

console.log('========== Environment Configuration Test ==========');
console.log('Runtime Environment:', envConfig.get('NODE_ENV'));
console.log('Blockchain Network:', networkConfig.getBlockchainNetwork());

console.log('\nRuntime Configuration:');
console.log('- NODE_ENV:', envConfig.get('NODE_ENV'));
console.log('- LOG_LEVEL:', envConfig.get('LOG_LEVEL'));

// 打印网络配置
console.log('\nBlockchain Network Configuration:');
console.log('- Network Name:', networkConfig.getNetworkName());
console.log('- Chain ID:', networkConfig.getChainId());
console.log('- RPC URL:', networkConfig.getRpcUrl());
console.log('- Is Testnet:', networkConfig.isTestnet());
console.log('- Is Mainnet:', networkConfig.isMainnet());
console.log('- Explorer URL:', networkConfig.getExplorerUrl());

console.log('\n=================================================');
console.log('Environment Configuration Guide:');
console.log('\n1. Runtime Environment (NODE_ENV):');
console.log('- development: 开发环境');
console.log('- test: 测试环境');
console.log('- production: 生产环境');
console.log('\n2. Blockchain Network (BLOCKCHAIN_NETWORK):');
console.log('- localhost: 本地开发网络');
console.log('- testnet: 测试网');
console.log('- mainnet: 主网');
console.log('\nTo test different environments, modify in .env file:');
console.log('NODE_ENV=development');
console.log('BLOCKCHAIN_NETWORK=localhost');
console.log('================================================='); 