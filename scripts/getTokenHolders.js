const { ethers } = require("hardhat");

/**
 * 获取特定快照时的代币持有者信息
 * @param {string} tokenAddress - 代币合约地址
 * @param {number} snapshotId - 快照ID
 * @param {string} systemAddress - 系统合约地址
 * @returns {Promise<Object>} - 持有者信息
 */
async function getTokenHolders(tokenAddress, snapshotId, systemAddress) {
  // 获取合约实例
  const system = await ethers.getContractAt("RealEstateSystem", systemAddress);
  const systemContracts = await system.getSystemContracts();
  const tokenHolderQuery = await ethers.getContractAt("TokenHolderQuery", systemContracts[7]);
  const token = await ethers.getContractAt("RealEstateToken", tokenAddress);
  
  // 获取所有Transfer事件以找出所有可能的持有者
  const filter = token.filters.Transfer();
  const events = await token.queryFilter(filter, 0, "latest");
  
  // 提取所有唯一的地址
  const addresses = new Set();
  for (const event of events) {
    addresses.add(event.args.from);
    addresses.add(event.args.to);
  }
  
  // 移除零地址
  addresses.delete(ethers.constants.AddressZero);
  
  // 转换为数组
  const holders = Array.from(addresses);
  
  // 批量查询余额
  const [balances, totalSupply] = await tokenHolderQuery.getBalancesAtSnapshot(
    tokenAddress,
    holders,
    snapshotId
  );
  
  // 过滤掉余额为0的地址
  const result = {
    snapshotId,
    totalSupply: ethers.utils.formatEther(totalSupply),
    holders: []
  };
  
  for (let i = 0; i < holders.length; i++) {
    if (balances[i].gt(0)) {
      result.holders.push({
        address: holders[i],
        balance: ethers.utils.formatEther(balances[i]),
        percentage: (parseFloat(ethers.utils.formatEther(balances[i])) / 
                    parseFloat(ethers.utils.formatEther(totalSupply)) * 100).toFixed(2) + '%'
      });
    }
  }
  
  return result;
}

/**
 * 获取特定租金分配的代币持有者信息
 * @param {string} distributionId - 分配ID
 * @param {string} systemAddress - 系统合约地址
 * @returns {Promise<Object>} - 持有者信息
 */
async function getDistributionHolders(distributionId, systemAddress) {
  // 获取合约实例
  const system = await ethers.getContractAt("RealEstateSystem", systemAddress);
  const systemContracts = await system.getSystemContracts();
  const rentDistributor = await ethers.getContractAt("RentDistributor", systemContracts[6]);
  
  // 获取分配信息
  const [propertyId, tokenAddress] = await rentDistributor.getDistributionInfo(distributionId);
  
  // 获取快照ID
  const snapshotId = await rentDistributor.getDistributionSnapshotId(distributionId);
  
  // 获取持有者信息
  return getTokenHolders(tokenAddress, snapshotId, systemAddress);
}

module.exports = {
  getTokenHolders,
  getDistributionHolders
};