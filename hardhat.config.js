/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// 临时修改: 仅使用ethers v5兼容配置
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
// 暂时注释掉依赖于ethers v6的插件
// require('@nomicfoundation/hardhat-verify');
// require('@openzeppelin/hardhat-upgrades');

// 自定义引入ethers v5
const ethers = require('ethers');
global.ethers = ethers;
global.getAddress = ethers.utils.getAddress;

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 准备私钥
function getPrivateKey() {
  try {
    const privateKeyPath = path.join(__dirname, '.secret');
    if (fs.existsSync(privateKeyPath)) {
      return fs.readFileSync(privateKeyPath, 'utf8').trim();
    } else {
      return process.env.PRIVATE_KEY || '';
    }
  } catch (error) {
    return process.env.PRIVATE_KEY || '';
  }
}

const privateKey = getPrivateKey();

// 确保部署状态目录存在
const deployStateDir = path.join(__dirname, 'deploy-state');
if (!fs.existsSync(deployStateDir)) {
  fs.mkdirSync(deployStateDir, { recursive: true });
}

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.22',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      }
    ]
  },
  paths: {
    sources: './contracts',
    cache: './cache',
    artifacts: './artifacts'
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 1337
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      accounts: privateKey ? [privateKey] : [],
      chainId: 80001,
      gasPrice: 2500000000
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: privateKey ? [privateKey] : [],
      chainId: 137,
      gasPrice: 50000000000
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      accounts: privateKey ? [privateKey] : [],
      chainId: 11155111
    }
  },
  mocha: {
    timeout: 40000
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || ''
    }
  }
};