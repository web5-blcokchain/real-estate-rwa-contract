const { ethers } = require('ethers');
const fs = require('fs');
const { networkConfig, contractAddresses, getAbiPath } = require('../config');
const logger = require('./logger');

// 缓存合约ABI
const abiCache = {};

/**
 * 获取合约ABI
 * @param {string} contractName 合约名称
 * @returns {object} 合约ABI
 */
const getContractAbi = (contractName) => {
  if (abiCache[contractName]) {
    return abiCache[contractName];
  }

  try {
    const abiPath = getAbiPath(contractName);
    const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const abi = abiJson.abi;
    abiCache[contractName] = abi;
    return abi;
  } catch (error) {
    logger.error(`Failed to load ABI for ${contractName}: ${error.message}`);
    throw new Error(`ABI not found for contract: ${contractName}`);
  }
};

/**
 * 获取Provider实例
 * @returns {ethers.providers.JsonRpcProvider} Provider实例
 */
const getProvider = () => {
  try {
    return new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
  } catch (error) {
    logger.error(`Failed to create provider: ${error.message}`);
    throw error;
  }
};

/**
 * 获取管理员Signer实例
 * @returns {ethers.Wallet} Signer实例
 */
const getAdminSigner = () => {
  try {
    const provider = getProvider();
    return new ethers.Wallet(networkConfig.privateKey, provider);
  } catch (error) {
    logger.error(`Failed to create admin signer: ${error.message}`);
    throw error;
  }
};

/**
 * 获取合约实例
 * @param {string} contractName 合约名称
 * @param {string} contractAddress 合约地址
 * @param {ethers.Signer} [signer] 可选的签名者
 * @returns {ethers.Contract} 合约实例
 */
const getContract = (contractName, contractAddress, signer) => {
  try {
    const abi = getContractAbi(contractName);
    const signerOrProvider = signer || getProvider();
    return new ethers.Contract(contractAddress, abi, signerOrProvider);
  } catch (error) {
    logger.error(`Failed to create contract instance for ${contractName}: ${error.message}`);
    throw error;
  }
};

/**
 * 获取系统中的合约实例
 * @param {string} contractName 合约名称
 * @param {boolean} [withSigner=true] 是否使用签名者
 * @returns {ethers.Contract} 合约实例
 */
const getSystemContract = (contractName, withSigner = true) => {
  const contractAddress = contractAddresses[contractName.toLowerCase()];
  if (!contractAddress) {
    throw new Error(`Contract address not found for: ${contractName}`);
  }
  
  const signer = withSigner ? getAdminSigner() : undefined;
  return getContract(contractName, contractAddress, signer);
};

/**
 * 发送交易并等待确认
 * @param {ethers.Contract} contract 合约实例
 * @param {string} method 方法名
 * @param {Array} args 参数数组
 * @returns {Promise<ethers.providers.TransactionReceipt>} 交易收据
 */
const sendTransaction = async (contract, method, args = []) => {
  try {
    logger.info(`Sending transaction to ${contract.address}.${method} with args: ${JSON.stringify(args)}`);
    
    const tx = await contract[method](...args);
    logger.info(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    logger.info(`Transaction confirmed: ${receipt.transactionHash}`);
    
    return receipt;
  } catch (error) {
    logger.error(`Transaction failed: ${error.message}`);
    throw error;
  }
};

/**
 * 调用只读合约方法
 * @param {ethers.Contract} contract 合约实例
 * @param {string} method 方法名
 * @param {Array} args 参数数组
 * @returns {Promise<any>} 返回结果
 */
const callContractMethod = async (contract, method, args = []) => {
  try {
    logger.debug(`Calling ${contract.address}.${method} with args: ${JSON.stringify(args)}`);
    const result = await contract[method](...args);
    return result;
  } catch (error) {
    logger.error(`Contract call failed: ${error.message}`);
    throw error;
  }
};

module.exports = {
  getProvider,
  getAdminSigner,
  getContract,
  getSystemContract,
  sendTransaction,
  callContractMethod,
  getContractAbi,
}; 