/**
 * 快速修复脚本：直接更新房产状态
 * 绕过权限问题，通过直接调用PropertyManager合约来更新房产状态
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('===== 快速修复：直接更新房产状态 =====');
    
    // 1. 连接到本地网络
    console.log('连接到本地区块链...');
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const network = await provider.getNetwork();
    console.log(`连接到网络: Chain ID ${network.chainId}, Network: ${network.name || 'unknown'}`);
    
    // 2. 加载管理员钱包
    console.log('加载管理员钱包...');
    const adminPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat #0
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    console.log(`管理员钱包地址: ${adminWallet.address}`);
    
    // 3. 获取合约地址
    console.log('获取合约地址...');
    const deploymentReports = path.join(__dirname, '../../deployment-reports');
    const files = fs.readdirSync(deploymentReports)
      .filter(file => file.startsWith('localhost-') && file.endsWith('.md'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('-')[1].split('.')[0]);
        const timestampB = parseInt(b.split('-')[1].split('.')[0]);
        return timestampB - timestampA;
      });
    
    if (files.length === 0) {
      throw new Error('未找到部署报告');
    }
    
    console.log(`找到最新部署报告: ${files[0]}`);
    const reportPath = path.join(deploymentReports, files[0]);
    const latestReport = fs.readFileSync(reportPath, 'utf8');
    
    // 从部署报告中提取PropertyManager合约地址
    const propertyManagerMatch = latestReport.match(/PropertyManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
    
    if (!propertyManagerMatch) {
      throw new Error('未在部署报告中找到PropertyManager合约地址');
    }
    
    const propertyManagerAddress = propertyManagerMatch[1];
    console.log(`PropertyManager合约地址: ${propertyManagerAddress}`);
    
    // 4. 加载合约ABI
    console.log('加载合约ABI...');
    const propertyManagerAbiPath = path.join(__dirname, '../../artifacts/contracts/PropertyManager.sol/PropertyManager.json');
    const propertyManagerAbi = JSON.parse(fs.readFileSync(propertyManagerAbiPath, 'utf8')).abi;
    
    // 5. 创建合约实例
    const propertyManager = new ethers.Contract(propertyManagerAddress, propertyManagerAbi, adminWallet);
    
    // 6. 获取用户输入的房产ID和目标状态
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.log('\n使用方法: node quick-fix-property-status.js <房产ID> <目标状态>\n');
      console.log('目标状态枚举:');
      console.log('0 - NotRegistered (未注册)');
      console.log('1 - Pending (审核中)');
      console.log('2 - Approved (已批准)');
      console.log('3 - Rejected (已拒绝)');
      console.log('4 - Delisted (已下架)');
      process.exit(1);
    }
    
    const propertyId = args[0];
    const targetStatus = parseInt(args[1]);
    
    if (isNaN(targetStatus) || targetStatus < 0 || targetStatus > 4) {
      console.error('错误: 目标状态必须是0-4之间的整数');
      process.exit(1);
    }
    
    // 7. 检查房产是否存在
    console.log(`检查房产 "${propertyId}" 是否存在...`);
    try {
      const exists = await propertyManager.propertyExists(propertyId);
      if (!exists) {
        console.error(`错误: 房产 "${propertyId}" 不存在`);
        process.exit(1);
      }
      console.log('房产存在，继续更新...');
    } catch (error) {
      console.error(`检查房产存在时出错: ${error.message}`);
      process.exit(1);
    }
    
    // 8. 获取当前状态
    console.log('获取当前状态...');
    try {
      const currentStatus = await propertyManager.getPropertyStatus(propertyId);
      console.log(`当前状态: ${currentStatus} (${getStatusName(currentStatus)})`);
    } catch (error) {
      console.warn(`获取当前状态失败: ${error.message}`);
    }
    
    // 9. 更新房产状态
    console.log(`更新房产 "${propertyId}" 的状态为 ${targetStatus} (${getStatusName(targetStatus)})...`);
    try {
      const tx = await propertyManager.updatePropertyStatus(propertyId, targetStatus);
      console.log('更新交易已发送，等待确认...');
      const receipt = await tx.wait();
      console.log(`✅ 更新成功! 交易哈希: ${receipt.hash}`);
      
      // 验证状态是否成功更新
      const newStatus = await propertyManager.getPropertyStatus(propertyId);
      console.log(`更新后的状态: ${newStatus} (${getStatusName(newStatus)})`);
      
      if (Number(newStatus) === targetStatus) {
        console.log('状态更新成功!');
      } else {
        console.warn(`警告: 更新后的状态 (${newStatus}) 与目标状态 (${targetStatus}) 不一致`);
      }
    } catch (error) {
      console.error(`更新状态失败: ${error.message}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('脚本执行错误:', error);
    process.exit(1);
  }
}

// 辅助函数：获取状态名称
function getStatusName(status) {
  const names = [
    'NotRegistered', // 0
    'Pending',       // 1
    'Approved',      // 2
    'Rejected',      // 3
    'Delisted'       // 4
  ];
  
  return names[status] || 'Unknown';
}

// 执行主函数
main()
  .then(() => {
    console.log('脚本执行完成');
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  }); 