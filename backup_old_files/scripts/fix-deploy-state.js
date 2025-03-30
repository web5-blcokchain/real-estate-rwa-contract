/**
 * 修复部署状态文件格式
 * 将合约地址转换为HTTP服务器期望的格式
 */
const fs = require('fs');
const path = require('path');

// 读取原始部署状态文件
const deployStateFile = path.join(__dirname, 'deploy-state.json');
const deployState = JSON.parse(fs.readFileSync(deployStateFile, 'utf8'));

// 创建新的部署状态格式
const newDeployState = {
  deployState: {
    contracts: {}
  }
};

// 提取合约地址并添加到新格式中
for (const [key, value] of Object.entries(deployState)) {
  // 处理库合约的特殊情况
  if (key === 'SystemDeployerLib1' || key === 'SystemDeployerLib2') {
    if (value && value.target) {
      newDeployState.deployState.contracts[key] = value.target;
    }
  } else if (typeof value === 'string') {
    // 普通合约地址
    newDeployState.deployState.contracts[key] = value;
  }
}

// 写入新的部署状态文件
const newDeployStateFile = path.join(__dirname, 'deploy-state-http.json');
fs.writeFileSync(newDeployStateFile, JSON.stringify(newDeployState, null, 2));

console.log('部署状态文件已转换为HTTP服务器格式');
console.log(`原始文件: ${deployStateFile}`);
console.log(`新文件: ${newDeployStateFile}`);

// 显示转换后的内容
console.log('\n转换后的内容:');
console.log(JSON.stringify(newDeployState, null, 2)); 