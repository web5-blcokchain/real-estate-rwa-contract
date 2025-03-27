const path = require('path');
const fs = require('fs');

/**
 * 项目根目录
 */
const ROOT_DIR = path.resolve(__dirname, '../../');

/**
 * 共享目录
 */
const SHARED_DIR = path.resolve(ROOT_DIR, 'shared');

/**
 * 合约目录
 */
const CONTRACTS_DIR = path.resolve(ROOT_DIR, 'contracts');

/**
 * 前端测试目录
 */
const FRONTEND_TESTS_DIR = path.resolve(ROOT_DIR, 'frontend-tests');

/**
 * 服务器目录
 */
const SERVER_DIR = path.resolve(ROOT_DIR, 'server');

/**
 * 监控目录
 */
const MONITOR_DIR = path.resolve(ROOT_DIR, 'monitor');

/**
 * 日志目录
 */
const LOG_DIR = path.resolve(ROOT_DIR, 'logs');

/**
 * 获取日志目录路径
 * @returns {string} 日志目录路径
 */
function getLogPath() {
  return LOG_DIR;
}

/**
 * 获取合约ABI路径
 * @param {string} contractName 合约名称
 * @returns {string} ABI文件路径
 */
function getContractAbiPath(contractName) {
  return path.resolve(CONTRACTS_DIR, 'artifacts', `${contractName}.json`);
}

/**
 * 获取环境变量文件路径
 * @returns {string} .env文件路径
 */
function getEnvPath() {
  return path.resolve(ROOT_DIR, '.env');
}

/**
 * 获取测试配置文件路径
 * @returns {string} 测试配置文件路径
 */
function getTestConfigPath() {
  return path.resolve(FRONTEND_TESTS_DIR, 'config', 'test.config.js');
}

/**
 * 获取测试账户文件路径
 * @returns {string} 测试账户文件路径
 */
function getTestAccountsPath() {
  return path.resolve(FRONTEND_TESTS_DIR, 'config', 'test.accounts.js');
}

/**
 * 获取部署状态文件路径
 * @returns {string} 部署状态文件路径
 */
function getDeployStatePath() {
  // 首先尝试scripts/logging/contracts.json
  const scriptsLoggingPath = path.resolve(ROOT_DIR, 'scripts/logging/contracts.json');
  if (fs.existsSync(scriptsLoggingPath)) {
    return scriptsLoggingPath;
  }
  
  // 然后尝试scripts/deployments/contracts.json（旧路径）
  const scriptsDeployStatePath = path.resolve(ROOT_DIR, 'scripts/deployments/contracts.json');
  if (fs.existsSync(scriptsDeployStatePath)) {
    return scriptsDeployStatePath;
  }
  
  // 再尝试根目录下的deploy-state.json
  const rootDeployStatePath = path.resolve(ROOT_DIR, 'deploy-state.json');
  if (fs.existsSync(rootDeployStatePath)) {
    return rootDeployStatePath;
  }
  
  // 最后尝试shared/deployments/contracts.json
  const sharedDeployStatePath = path.resolve(ROOT_DIR, 'shared/deployments/contracts.json');
  if (fs.existsSync(sharedDeployStatePath)) {
    return sharedDeployStatePath;
  }
  
  // 最后返回首选路径（即使它不存在）
  return scriptsLoggingPath;
}

/**
 * 获取错误日志文件路径
 * @returns {string} 错误日志文件路径
 */
function getErrorLogPath() {
  return path.resolve(LOG_DIR, 'error.log');
}

/**
 * 获取缓存目录路径
 * @returns {string} 缓存目录路径
 */
function getCachePath() {
  return path.resolve(LOG_DIR, 'cache.json');
}

/**
 * 获取指标文件路径
 * @returns {string} 指标文件路径
 */
function getMetricsPath() {
  return path.resolve(LOG_DIR, 'metrics.json');
}

/**
 * 获取网络配置文件路径
 * @param {string} network 网络名称
 * @returns {string} 网络配置文件路径
 */
function getNetworkConfigPath(network) {
  return path.resolve(SHARED_DIR, 'config', 'networks', `${network}.js`);
}

/**
 * 获取Hardhat配置文件路径
 * @returns {string} Hardhat配置文件路径
 */
function getHardhatConfigPath() {
  return path.resolve(ROOT_DIR, 'hardhat.config.js');
}

/**
 * 验证文件路径
 * @param {string} filePath 文件路径
 * @returns {boolean} 是否有效
 */
function validatePath(filePath) {
  try {
    require('fs').accessSync(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取合约地址
 * @param {string} contractName 合约名称
 * @returns {string} 合约地址
 */
function getContractAddress(contractName) {
  try {
    // 首先尝试从部署状态文件获取
    const deployStatePath = getDeployStatePath();
    if (fs.existsSync(deployStatePath)) {
      const addresses = require(deployStatePath);
      if (addresses[contractName]) {
        return addresses[contractName];
      } else if (addresses.contracts && addresses.contracts[contractName]) {
        return addresses.contracts[contractName];
      }
    }

    // 然后尝试从scripts/logging目录下的latest文件获取
    const scriptsLoggingDir = path.resolve(ROOT_DIR, 'scripts/logging');
    if (fs.existsSync(scriptsLoggingDir)) {
      const files = fs.readdirSync(scriptsLoggingDir).filter(file => file.includes('latest.json'));
      for (const file of files) {
        const filePath = path.resolve(scriptsLoggingDir, file);
        const deployment = require(filePath);
        if (deployment.contracts && deployment.contracts[contractName]) {
          return deployment.contracts[contractName];
        }
      }
    }

    // 然后尝试从scripts/deployments目录下的latest文件获取（旧路径）
    const scriptsDeploymentsDir = path.resolve(ROOT_DIR, 'scripts/deployments');
    if (fs.existsSync(scriptsDeploymentsDir)) {
      const files = fs.readdirSync(scriptsDeploymentsDir).filter(file => file.includes('latest.json'));
      for (const file of files) {
        const filePath = path.resolve(scriptsDeploymentsDir, file);
        const deployment = require(filePath);
        if (deployment.contracts && deployment.contracts[contractName]) {
          return deployment.contracts[contractName];
        }
      }
    }

    // 最后尝试从deployments目录下的latest文件获取
    const deploymentsDir = path.resolve(ROOT_DIR, 'deployments');
    if (fs.existsSync(deploymentsDir)) {
      const files = fs.readdirSync(deploymentsDir).filter(file => file.includes('latest.json'));
      for (const file of files) {
        const filePath = path.resolve(deploymentsDir, file);
        const deployment = require(filePath);
        if (deployment.contracts && deployment.contracts[contractName]) {
          return deployment.contracts[contractName];
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting contract address for ${contractName}:`, error);
    return null;
  }
}

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {Array} 合约ABI
 */
function getContractAbi(contractName) {
  const abiPath = path.resolve(CONTRACTS_DIR, 'artifacts', `${contractName}.json`);
  try {
    const artifact = require(abiPath);
    return artifact.abi;
  } catch (error) {
    return null;
  }
}

/**
 * 获取监控配置路径
 * @returns {string} 监控配置路径
 */
function getMonitorConfigPath() {
  return path.resolve(MONITOR_DIR, 'src', 'config');
}

/**
 * 获取监控日志路径
 * @returns {string} 监控日志路径
 */
function getMonitorLogPath() {
  return path.resolve(MONITOR_DIR, 'logs');
}

module.exports = {
  ROOT_DIR,
  SHARED_DIR,
  CONTRACTS_DIR,
  FRONTEND_TESTS_DIR,
  SERVER_DIR,
  MONITOR_DIR,
  LOG_DIR,
  getLogPath,
  getContractAbiPath,
  getEnvPath,
  getTestConfigPath,
  getTestAccountsPath,
  getDeployStatePath,
  getErrorLogPath,
  getCachePath,
  getMetricsPath,
  getNetworkConfigPath,
  getHardhatConfigPath,
  validatePath,
  getContractAddress,
  getContractAbi,
  getMonitorConfigPath,
  getMonitorLogPath
}; 