const fs = require('fs');
const path = require('path');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const ethers = require('ethers');
const { ContractUtils, Logger } = require('../../common');

const logger = Logger;
const DATA_DIR = path.join(__dirname, '../../data/distributions');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class MerkleDistributionUtils {
  /**
   * 生成默克尔树
   * @param {Object} userBalances - 用户余额映射 {address: balance}
   * @param {BigInt|String} totalAmount - 总分配金额
   * @returns {Object} - 包含默克尔树信息的对象
   */
  static generateMerkleTree(userBalances, totalAmount) {
    logger.info(`Generating Merkle tree for distribution of ${totalAmount}`);
    
    // 计算总供应量
    let totalSupply = BigInt(0);
    const addresses = Object.keys(userBalances);
    
    addresses.forEach(address => {
      totalSupply += BigInt(userBalances[address]);
    });
    
    logger.info(`Total token supply: ${totalSupply}, Users count: ${addresses.length}`);
    
    // 计算每个用户应得的金额并创建叶子节点
    const leafNodes = [];
    const claims = {};
    
    addresses.forEach(address => {
      // 计算用户份额
      const userBalance = BigInt(userBalances[address]);
      const userAmount = (userBalance * BigInt(totalAmount)) / totalSupply;
      
      // 创建叶子节点: keccak256(address + amount)
      const leaf = ethers.solidityPackedKeccak256(
        ['address', 'uint256'],
        [address, userAmount.toString()]
      );
      
      leafNodes.push(leaf);
      
      // 保存用户索赔信息
      claims[address] = {
        amount: userAmount.toString(),
        balance: userBalance.toString(),
        leaf
      };
    });
    
    // 创建默克尔树
    const merkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true,
      hashLeaves: false // 已经哈希过了
    });
    
    const root = merkleTree.getHexRoot();
    // 确保只有一个 0x 前缀
    const merkleRoot = root.startsWith('0x') ? root : '0x' + root;
    logger.info(`Generated Merkle tree with root: ${merkleRoot}`);
    
    // 为每个用户添加证明
    addresses.forEach(address => {
      const leaf = claims[address].leaf;
      claims[address].proof = merkleTree.getHexProof(leaf);
    });
    
    return {
      merkleRoot: merkleRoot,
      claims,
      totalAmount: totalAmount.toString(),
      totalSupply: totalSupply.toString(),
      timestamp: Date.now(),
      userCount: addresses.length
    };
  }
  
  /**
   * 验证用户证明
   * @param {String} userAddress - 用户地址
   * @param {String} amount - 索赔金额
   * @param {Array} proof - 默克尔证明
   * @param {String} merkleRoot - 默克尔根
   * @returns {Boolean} - 证明是否有效
   */
  static verifyProof(userAddress, amount, proof, merkleRoot) {
    // 创建叶子节点: keccak256(address + amount)
    const leaf = ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [userAddress, amount]
    );
    
    // 验证证明
    const tree = new MerkleTree([], keccak256, { sortPairs: true });
    return tree.verify(proof, leaf, merkleRoot);
  }
  
  /**
   * 获取代币持有者信息
   * @param {String} tokenAddress - 代币合约地址
   * @param {Object} provider - 区块链提供者
   * @returns {Promise<Object>} - 用户余额映射 {address: balance}
   */
  static async getTokenHolders(tokenAddress, provider) {
    try {
      logger.info(`Fetching token holders for token: ${tokenAddress}`);
      
      // 获取ERC20合约
      const erc20Contract = await ContractUtils.getReadonlyContractWithProvider(
        'SimpleERC20',
        tokenAddress,
        provider
      );
      
      // 获取转账事件以找到所有可能的持有者
      // 注意：这种方法在生产环境可能需要优化，例如使用索引或缓存
      const filter = erc20Contract.filters.Transfer();
      const events = await erc20Contract.queryFilter(filter);
      
      // 提取唯一地址
      const addresses = new Set();
      events.forEach(event => {
        addresses.add(event.args.from);
        addresses.add(event.args.to);
      });
      
      // 移除零地址
      addresses.delete(ethers.ZeroAddress);
      
      logger.info(`Found ${addresses.size} potential holders`);
      
      // 获取当前余额
      const userBalances = {};
      await Promise.all(
        Array.from(addresses).map(async (address) => {
          const balance = await erc20Contract.balanceOf(address);
          if (balance > 0) {
            userBalances[address] = balance.toString();
          }
        })
      );
      
      logger.info(`Found ${Object.keys(userBalances).length} active holders with positive balance`);
      return userBalances;
    } catch (error) {
      logger.error(`Error getting token holders: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 为特定资产生成分配默克尔树
   * @param {String} propertyId - 物业ID
   * @param {String} tokenAddress - 代币合约地址
   * @param {BigInt|String} totalAmount - 总分配金额
   * @param {Object} provider - 区块链提供者
   * @returns {Promise<Object>} - 默克尔树数据
   */
  static async generateDistributionTree(propertyId, tokenAddress, totalAmount, provider) {
    try {
      logger.info(`Generating distribution tree for property ${propertyId}`);
      
      // 获取代币持有者信息
      const userBalances = await this.getTokenHolders(tokenAddress, provider);
      
      // 生成默克尔树
      const treeData = this.generateMerkleTree(userBalances, totalAmount);
      
      // 添加元数据
      treeData.propertyId = propertyId;
      treeData.tokenAddress = tokenAddress;
      
      return treeData;
    } catch (error) {
      logger.error(`Error generating distribution tree: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 保存分配数据
   * @param {String} distributionId - 分配ID
   * @param {Object} treeData - 默克尔树数据
   */
  static saveDistributionData(distributionId, treeData) {
    try {
      const filename = path.join(DATA_DIR, `distribution-${distributionId}.json`);
      fs.writeFileSync(filename, JSON.stringify(treeData, null, 2));
      logger.info(`Distribution data saved to ${filename}`);
      return filename;
    } catch (error) {
      logger.error(`Error saving distribution data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 加载分配数据
   * @param {String} distributionId - 分配ID
   * @returns {Object} - 默克尔树数据
   */
  static loadDistributionData(distributionId) {
    try {
      const filename = path.join(DATA_DIR, `distribution-${distributionId}.json`);
      if (!fs.existsSync(filename)) {
        throw new Error(`Distribution data not found for ID: ${distributionId}`);
      }
      
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      logger.info(`Distribution data loaded from ${filename}`);
      return data;
    } catch (error) {
      logger.error(`Error loading distribution data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 获取用户分配详情
   * @param {String} distributionId - 分配ID
   * @param {String} userAddress - 用户地址
   * @returns {Object} - 用户分配详情
   */
  static getUserDistributionDetails(distributionId, userAddress) {
    try {
      const treeData = this.loadDistributionData(distributionId);
      const userClaim = treeData.claims[userAddress];
      
      if (!userClaim) {
        logger.info(`User ${userAddress} has no claim in distribution ${distributionId}`);
        return null;
      }
      
      return {
        distributionId,
        userAddress,
        amount: userClaim.amount,
        proof: userClaim.proof,
        merkleRoot: treeData.merkleRoot
      };
    } catch (error) {
      logger.error(`Error getting user distribution details: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MerkleDistributionUtils; 