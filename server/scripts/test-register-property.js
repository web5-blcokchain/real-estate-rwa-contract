const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 测试数据
const TEST_DATA = {
  propertyId: '0x1234567890123456789012345678901234567890',
  propertyData: {
    country: 'JP',
    metadataURI: 'ipfs://Qm...'
  },
  tokenData: {
    name: 'Test Property Token',
    symbol: 'TPT',
    initialSupply: '1000000000000000000'
  },
  propertyTokenImplementation: '0x457cCf29090fe5A24c19c1bc95F492168C0EaFdb'
};

// 角色常量
const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE"));
const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));

/**
 * 获取最新的部署报告
 */
function getLatestDeploymentReport() {
  const reportsDir = path.join(__dirname, '../../deployment-reports');
  const files = fs.readdirSync(reportsDir)
    .filter(file => file.startsWith('localhost-') && file.endsWith('.md'))
    .sort((a, b) => {
      const timestampA = parseInt(a.split('-')[1].split('.')[0]);
      const timestampB = parseInt(b.split('-')[1].split('.')[0]);
      return timestampB - timestampA;
    });

  if (files.length === 0) {
    throw new Error('未找到部署报告');
  }

  const latestReport = fs.readFileSync(path.join(reportsDir, files[0]), 'utf8');
  
  // 从 Markdown 报告中提取合约地址
  const facadeMatch = /### 7\. RealEstateFacade\n- 地址: (0x[a-fA-F0-9]{40})/m.exec(latestReport);
  const systemMatch = /### 1\. RealEstateSystem\n- 地址: (0x[a-fA-F0-9]{40})/m.exec(latestReport);
  
  if (!facadeMatch || !systemMatch) {
    throw new Error('无法从部署报告中提取合约地址');
  }
  
  return {
    contracts: {
      realEstateFacade: {
        address: facadeMatch[1]
      },
      realEstateSystem: {
        address: systemMatch[1]
      }
    }
  };
}

async function main() {
  try {
    // 获取合约地址
    const deploymentReport = getLatestDeploymentReport();
    const facadeAddress = deploymentReport.contracts.realEstateFacade.address;
    const systemAddress = deploymentReport.contracts.realEstateSystem.address;
    
    console.log('使用合约地址:', {
      facadeAddress,
      systemAddress
    });

    // 设置provider和wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
    const operatorPrivateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!operatorPrivateKey) {
      throw new Error('未设置 OPERATOR_PRIVATE_KEY 环境变量');
    }
    const wallet = new ethers.Wallet(operatorPrivateKey, provider);

    // 获取合约ABI
    const facadeABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json'))).abi;
    const systemABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json'))).abi;
    
    // 创建合约实例
    const facadeContract = new ethers.Contract(facadeAddress, facadeABI, wallet);
    const systemContract = new ethers.Contract(systemAddress, systemABI, wallet);

    // 检查账户是否有 OPERATOR_ROLE
    const hasOperatorRole = await systemContract.hasRole(OPERATOR_ROLE, wallet.address);
    console.log('账户权限检查:', {
      address: wallet.address,
      operatorRole: OPERATOR_ROLE,
      hasOperatorRole
    });

    if (!hasOperatorRole) {
      throw new Error('账户没有 OPERATOR_ROLE 权限');
    }

    console.log('准备调用合约方法 registerPropertyAndCreateToken');
    console.log('参数:', {
      propertyId: TEST_DATA.propertyId,
      country: TEST_DATA.propertyData.country,
      metadataURI: TEST_DATA.propertyData.metadataURI,
      tokenName: TEST_DATA.tokenData.name,
      tokenSymbol: TEST_DATA.tokenData.symbol,
      initialSupply: TEST_DATA.tokenData.initialSupply,
      implementation: TEST_DATA.propertyTokenImplementation
    });

    // 调用合约方法
    const tx = await facadeContract.registerPropertyAndCreateToken(
      TEST_DATA.propertyId,
      TEST_DATA.propertyData.country,
      TEST_DATA.propertyData.metadataURI,
      TEST_DATA.tokenData.initialSupply,
      TEST_DATA.tokenData.name,
      TEST_DATA.tokenData.symbol
    );

    console.log('交易已发送:', tx.hash);

    // 等待交易确认
    console.log('等待交易确认...');
    const receipt = await tx.wait();
    console.log('交易已确认:', { 
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

    // 解析事件日志
    const propertyRegisteredEvent = receipt.logs.find(log => {
      try {
        const parsedLog = facadeContract.interface.parseLog(log);
        return parsedLog.name === 'PropertyRegistered';
      } catch (e) {
        return false;
      }
    });

    if (propertyRegisteredEvent) {
      const parsedEvent = facadeContract.interface.parseLog(propertyRegisteredEvent);
      console.log('房产注册成功:', {
        propertyId: parsedEvent.args.propertyId,
        country: parsedEvent.args.country,
        tokenAddress: parsedEvent.args.tokenAddress
      });
    }

  } catch (error) {
    console.error('测试执行失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
main().catch(error => {
  console.error('测试执行失败:', error.message);
  process.exit(1);
}); 