/**
 * 部署合约地址管理工具
 * 从config/deployment.json加载部署的合约地址
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 部署配置文件路径
const DEPLOYMENT_CONFIG_PATH = path.join(__dirname, '../../../config/deployment.json');

class DeploymentUtils {
  constructor() {
    this.deploymentConfig = this.loadDeploymentConfig();
    this.contracts = this.deploymentConfig.contracts || {};
  }

  /**
   * 加载部署配置文件
   * @returns {Object} 部署配置对象
   */
  loadDeploymentConfig() {
    try {
      if (!fs.existsSync(DEPLOYMENT_CONFIG_PATH)) {
        console.warn(`部署配置文件不存在: ${DEPLOYMENT_CONFIG_PATH}`);
        return { contracts: {} };
      }

      const config = JSON.parse(fs.readFileSync(DEPLOYMENT_CONFIG_PATH, 'utf8'));
      return config;
    } catch (error) {
      console.error(`加载部署配置文件失败: ${error}`);
      return { contracts: {} };
    }
  }

  /**
   * 获取合约地址
   * @param {string} contractName - 合约名称，与合约代码中的名称完全一致
   * @returns {string} 合约地址
   */
  getContractAddress(contractName) {
    if (!this.contracts[contractName]) {
      throw new Error(`未找到合约 ${contractName} 的部署地址`);
    }
    return this.contracts[contractName];
  }

  /**
   * 获取所有已部署的合约地址
   * @returns {Object} 所有合约地址
   */
  getAllContractAddresses() {
    return { ...this.contracts };
  }

  /**
   * 检查合约是否已部署
   * @param {string} contractName - 合约名称
   * @returns {boolean} 是否已部署
   */
  isContractDeployed(contractName) {
    return !!this.contracts[contractName];
  }

  /**
   * 获取部署信息
   * @returns {Object} 部署信息，包括网络、时间戳、部署者地址等
   */
  getDeploymentInfo() {
    return {
      network: this.deploymentConfig.network,
      timestamp: this.deploymentConfig.timestamp,
      deployer: this.deploymentConfig.deployer,
      systemStatus: this.deploymentConfig.systemStatus,
      deployMethod: this.deploymentConfig.deployMethod
    };
  }

  /**
   * 获取实现合约地址
   * @param {string} contractName - 合约名称
   * @returns {string} 实现合约地址
   */
  getImplementationAddress(contractName) {
    if (!this.deploymentConfig.implementations || !this.deploymentConfig.implementations[contractName]) {
      throw new Error(`未找到合约 ${contractName} 的实现地址`);
    }
    return this.deploymentConfig.implementations[contractName];
  }

  /**
   * 获取所有实现合约地址
   * @returns {Object} 所有实现合约地址
   */
  getAllImplementationAddresses() {
    return { ...(this.deploymentConfig.implementations || {}) };
  }
}

// 创建单例实例
const deploymentUtils = new DeploymentUtils();
export default deploymentUtils;
// 同时导出类，以便可以创建新实例
export { DeploymentUtils }; 