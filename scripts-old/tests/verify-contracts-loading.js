/**
 * 合约地址加载验证脚本
 * 验证shared/config/contracts.js能够正确加载scripts/deploy-state.json中的合约地址
 */

const fs = require('fs');
const path = require('path');
const { getContractAddresses, DEPLOY_STATE_PATH } = require('../../shared/config/contracts');

/**
 * 验证合约地址加载是否正确
 */
async function verifyContractsLoading() {
  console.log('===============================================');
  console.log('== 验证合约地址加载 ==');
  console.log('===============================================');
  
  // 1. 检查deploy-state.json文件是否存在
  console.log(`\n检查部署状态文件: ${DEPLOY_STATE_PATH}`);
  if (!fs.existsSync(DEPLOY_STATE_PATH)) {
    console.error(`❌ 错误: 部署状态文件不存在: ${DEPLOY_STATE_PATH}`);
    process.exit(1);
  }
  console.log(`✅ 部署状态文件存在: ${DEPLOY_STATE_PATH}`);
  
  // 2. 读取文件内容并解析
  const fileContent = fs.readFileSync(DEPLOY_STATE_PATH, 'utf8');
  if (!fileContent || fileContent.trim() === '') {
    console.error('❌ 错误: 部署状态文件为空');
    process.exit(1);
  }
  console.log('✅ 部署状态文件不为空');
  
  let deployStateContent = null;
  try {
    deployStateContent = JSON.parse(fileContent);
    console.log('✅ 部署状态文件格式正确');
  } catch (error) {
    console.error(`❌ 错误: 部署状态文件格式无效: ${error.message}`);
    process.exit(1);
  }
  
  // 3. 检查文件内容格式
  if (!deployStateContent || typeof deployStateContent !== 'object' || Object.keys(deployStateContent).length === 0) {
    console.error('❌ 错误: 部署状态文件不包含有效的合约地址');
    process.exit(1);
  }
  
  const contractKeysFromFile = Object.keys(deployStateContent);
  console.log(`\n从文件直接读取的合约: ${contractKeysFromFile.length} 个`);
  contractKeysFromFile.forEach(key => {
    console.log(`- ${key}: ${deployStateContent[key]}`);
  });
  
  // 4. 使用shared/config/contracts.js加载合约地址
  console.log('\n从合约配置模块加载合约地址...');
  const addresses = getContractAddresses();
  
  if (!addresses || typeof addresses !== 'object' || Object.keys(addresses).length === 0) {
    console.error('❌ 错误: 合约配置模块无法加载合约地址');
    process.exit(1);
  }
  
  const contractKeysFromModule = Object.keys(addresses);
  console.log(`从合约配置模块加载的合约: ${contractKeysFromModule.length} 个`);
  contractKeysFromModule.forEach(key => {
    console.log(`- ${key}: ${addresses[key]}`);
  });
  
  // 5. 验证两者是否一致
  console.log('\n比较直接读取和通过模块加载的合约地址...');
  
  let allMatch = true;
  for (const key of contractKeysFromFile) {
    if (!addresses[key]) {
      console.error(`❌ 错误: 合约 ${key} 在配置模块中不存在`);
      allMatch = false;
      continue;
    }
    
    if (addresses[key] !== deployStateContent[key]) {
      console.error(`❌ 错误: 合约 ${key} 地址不匹配:`);
      console.error(`  文件中: ${deployStateContent[key]}`);
      console.error(`  模块中: ${addresses[key]}`);
      allMatch = false;
    }
  }
  
  if (allMatch) {
    console.log('✅ 所有合约地址匹配成功，合约配置模块正确加载了deploy-state.json中的地址');
  } else {
    console.error('❌ 合约地址匹配失败，合约配置模块未正确加载deploy-state.json中的地址');
    process.exit(1);
  }
  
  console.log('\n验证完成! ✅✅✅');
}

// 执行验证
verifyContractsLoading().catch(error => {
  console.error(`验证过程中发生错误: ${error.message}`);
  process.exit(1);
}); 