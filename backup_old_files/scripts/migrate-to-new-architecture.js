/**
 * 从旧部署架构迁移到新架构
 * 
 * 该脚本帮助用户从旧的部署架构迁移到新的三层部署架构
 * 它会分析现有部署文件，并创建与新架构兼容的部署记录
 */

const fs = require('fs');
const path = require('path');
const { deploymentState } = require('../shared/utils/deployment-state');

// 配置
const CONFIG = {
  // 源文件路径
  sourcePaths: {
    deployState: 'scripts/deploy-state.json',
    contracts: 'scripts/logging/contracts.json',
    deploymentLogs: 'scripts/logging'
  },
  
  // 目标文件路径
  targetPaths: {
    deployments: 'shared/deployments',
    migrationReport: 'scripts/migration-report.md'
  }
};

/**
 * 主迁移函数
 */
async function main() {
  console.log('开始迁移到新部署架构...');
  
  try {
    // 1. 确保目标目录存在
    ensureDirectoriesExist();
    
    // 2. 读取现有部署文件
    const deployState = readFileIfExists(CONFIG.sourcePaths.deployState);
    const contractsFile = readFileIfExists(CONFIG.sourcePaths.contracts);
    
    // 3. 分析日志目录，找出最新的部署记录
    const deploymentLogs = findDeploymentLogs();
    const latestDeployment = findLatestDeployment(deploymentLogs);
    
    console.log(`找到 ${deploymentLogs.length} 个部署日志`);
    console.log(`最新部署: ${latestDeployment?.file || '未找到'}`);
    
    // 4. 创建新架构的部署记录
    const migrationResult = await createNewDeploymentRecords(deployState, contractsFile, latestDeployment);
    
    // 5. 生成迁移报告
    generateMigrationReport(migrationResult);
    
    console.log('迁移完成!');
    console.log(`迁移报告已保存到: ${CONFIG.targetPaths.migrationReport}`);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

/**
 * 确保目标目录存在
 */
function ensureDirectoriesExist() {
  const deploymentsDir = path.join(process.cwd(), CONFIG.targetPaths.deployments);
  
  if (!fs.existsSync(deploymentsDir)) {
    console.log(`创建目录: ${deploymentsDir}`);
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
}

/**
 * 读取文件（如果存在）
 * @param {string} filePath 文件路径
 * @returns {Object|null} 文件内容或null
 */
function readFileIfExists(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`无法解析文件 ${filePath}: ${error.message}`);
      return null;
    }
  }
  
  console.warn(`文件不存在: ${filePath}`);
  return null;
}

/**
 * 查找部署日志文件
 * @returns {Array} 部署日志文件列表
 */
function findDeploymentLogs() {
  const loggingDir = path.join(process.cwd(), CONFIG.sourcePaths.deploymentLogs);
  
  if (!fs.existsSync(loggingDir)) {
    console.warn(`部署日志目录不存在: ${loggingDir}`);
    return [];
  }
  
  // 查找所有网络部署日志文件
  const files = fs.readdirSync(loggingDir)
    .filter(file => file.match(/^[a-zA-Z]+-\d{4}-\d{2}-\d{2}T.+\.json$/))
    .map(file => ({
      file,
      path: path.join(loggingDir, file),
      time: fs.statSync(path.join(loggingDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // 按修改时间降序排序
  
  return files;
}

/**
 * 查找最新的部署记录
 * @param {Array} deploymentLogs 部署日志文件列表
 * @returns {Object|null} 最新的部署记录
 */
function findLatestDeployment(deploymentLogs) {
  if (deploymentLogs.length === 0) {
    return null;
  }
  
  // 获取最新的部署日志
  const latest = deploymentLogs[0];
  
  try {
    const content = fs.readFileSync(latest.path, 'utf8');
    const deployment = JSON.parse(content);
    
    return {
      ...latest,
      data: deployment
    };
  } catch (error) {
    console.warn(`无法解析最新部署日志 ${latest.file}: ${error.message}`);
    return null;
  }
}

/**
 * 创建新架构的部署记录
 * @param {Object} deployState 部署状态
 * @param {Object} contractsFile 合约文件
 * @param {Object} latestDeployment 最新部署记录
 * @returns {Object} 迁移结果
 */
async function createNewDeploymentRecords(deployState, contractsFile, latestDeployment) {
  console.log('创建新架构的部署记录...');
  
  // 准备基本数据
  const migrationResult = {
    deployState: Boolean(deployState),
    contractsFile: Boolean(contractsFile),
    latestDeployment: Boolean(latestDeployment?.data),
    savedFiles: []
  };
  
  // 合并合约地址
  const contracts = {};
  const libraries = {};
  
  // 1. 从deploy-state.json获取地址
  if (deployState) {
    Object.entries(deployState).forEach(([key, value]) => {
      if (key === 'SystemDeployerLib1' || key === 'SystemDeployerLib2') {
        libraries[key] = value;
      } else {
        contracts[key] = value;
      }
    });
  }
  
  // 2. 从contracts.json获取额外信息
  if (contractsFile) {
    // 添加库合约
    if (contractsFile.libraries) {
      Object.entries(contractsFile.libraries).forEach(([key, value]) => {
        libraries[key] = value;
      });
    }
    
    // 添加其他合约
    if (contractsFile.contracts) {
      Object.entries(contractsFile.contracts).forEach(([key, value]) => {
        contracts[key] = value;
      });
    }
  }
  
  // 3. 创建综合部署记录
  const timestamp = new Date().toISOString();
  const networkName = latestDeployment?.data?.network || 'unknown';
  const strategy = latestDeployment?.data?.strategy || 'upgradeable';
  const deployer = latestDeployment?.data?.deployer || '';
  
  // 创建新的部署记录
  const newDeploymentRecord = {
    timestamp,
    network: networkName,
    strategy,
    deployer,
    libraries,
    contracts,
    migrated: true,
    migrationDate: timestamp
  };
  
  // 4. 保存到新位置
  const targetDir = path.join(process.cwd(), CONFIG.targetPaths.deployments);
  
  // 保存合约地址文件
  const contractsPath = path.join(targetDir, 'contracts.json');
  fs.writeFileSync(contractsPath, JSON.stringify({
    ...libraries,
    ...contracts
  }, null, 2));
  migrationResult.savedFiles.push(contractsPath);
  
  // 保存网络特定的最新部署记录
  const latestPath = path.join(targetDir, `${networkName}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(newDeploymentRecord, null, 2));
  migrationResult.savedFiles.push(latestPath);
  
  // 5. 同步到deploymentState
  if (Object.keys(contracts).length > 0) {
    console.log('同步合约地址到deploymentState...');
    
    for (const [key, address] of Object.entries(contracts)) {
      await deploymentState.updateContractAddress(key, address);
    }
    
    for (const [key, address] of Object.entries(libraries)) {
      await deploymentState.updateContractAddress(key, address);
    }
  }
  
  return migrationResult;
}

/**
 * 生成迁移报告
 * @param {Object} migrationResult 迁移结果
 */
function generateMigrationReport(migrationResult) {
  const reportPath = path.join(process.cwd(), CONFIG.targetPaths.migrationReport);
  
  let report = `# 部署架构迁移报告\n\n`;
  report += `**迁移时间**: ${new Date().toISOString()}\n\n`;
  
  report += `## 迁移结果\n\n`;
  report += `- 部署状态文件 (deploy-state.json): ${migrationResult.deployState ? '✅ 已找到' : '❌ 未找到'}\n`;
  report += `- 合约文件 (contracts.json): ${migrationResult.contractsFile ? '✅ 已找到' : '❌ 未找到'}\n`;
  report += `- 最新部署记录: ${migrationResult.latestDeployment ? '✅ 已找到' : '❌ 未找到'}\n\n`;
  
  report += `## 已创建的文件\n\n`;
  migrationResult.savedFiles.forEach(file => {
    report += `- ${file.replace(process.cwd(), '')}\n`;
  });
  
  report += `\n## 下一步\n\n`;
  report += `1. 查看新的部署架构文档: \`shared/utils/DEPLOYMENT_ARCHITECTURE.md\`\n`;
  report += `2. 使用新的部署脚本: \`scripts/deploy-with-new-architecture.js\`\n`;
  report += `3. 可以安全地继续使用现有合约，所有地址已迁移到新架构\n`;
  
  fs.writeFileSync(reportPath, report);
}

// 执行迁移
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  }); 