const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("获取合约实现地址...");
    
    // 读取部署信息
    const deploymentPath = path.join(__dirname, "../config/deployment.json");
    if (!fs.existsSync(deploymentPath)) {
      console.error("部署信息文件不存在:", deploymentPath);
      return;
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    
    // 创建实现地址对象
    const implementations = {};
    
    // 获取每个代理合约的实现地址
    for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
      // 跳过非代理合约或无效地址
      if (name === "systemDeployer" || name === "testToken" || !address || address === "0x") {
        continue;
      }
      
      try {
        console.log(`获取 ${name} 的实现地址...`);
        const implAddress = await upgrades.erc1967.getImplementationAddress(address);
        implementations[name] = implAddress;
        console.log(`${name}:`);
        console.log(`  - 代理地址: ${address}`);
        console.log(`  - 实现地址: ${implAddress}`);
      } catch (error) {
        console.error(`获取 ${name} 的实现地址失败:`, error.message);
      }
    }
    
    // 保存实现地址到配置文件
    const implementationsPath = path.join(__dirname, "../config/implementations.json");
    const configDir = path.dirname(implementationsPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(
      implementationsPath,
      JSON.stringify(implementations, null, 2)
    );
    console.log(`实现地址已保存到 ${implementationsPath}`);
    
    // 更新部署信息，添加实现地址
    deploymentInfo.implementations = implementations;
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`部署信息已更新，包含实现地址`);
    
    // 生成部署报告
    await generateDeploymentReport(deploymentInfo);
    
    console.log("完成!");
  } catch (error) {
    console.error("获取实现地址过程中出错:", error);
  }
}

async function generateDeploymentReport(deploymentInfo) {
  // 创建报告目录
  const reportDir = path.join(__dirname, "../docs/deploy");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // 创建时间戳
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `implementation-report-${timestamp}.md`);
  
  // 生成报告内容
  let reportContent = `# 合约部署报告 (${timestamp})

## 部署信息
- 网络: ${deploymentInfo.network}
- 部署时间: ${deploymentInfo.timestamp}
- 部署者地址: ${deploymentInfo.deployer}
- 系统状态: ${deploymentInfo.systemStatus}

## 合约地址

| 合约 | 代理地址 | 实现地址 |
|------|----------|----------|
`;

  // 添加合约地址信息
  for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
    if (name === "systemDeployer" || name === "testToken") {
      reportContent += `| ${name} | ${address} | 非代理合约 |\n`;
    } else if (deploymentInfo.implementations && deploymentInfo.implementations[name]) {
      reportContent += `| ${name} | ${address} | ${deploymentInfo.implementations[name]} |\n`;
    } else {
      reportContent += `| ${name} | ${address} | 未获取 |\n`;
    }
  }
  
  // 添加初始化参数
  reportContent += `
## 初始化参数

\`\`\`json
${JSON.stringify(deploymentInfo.initializationParams, null, 2)}
\`\`\`
`;

  // 写入报告文件
  fs.writeFileSync(reportPath, reportContent);
  console.log(`部署报告已生成: ${reportPath}`);
  
  return reportPath;
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 