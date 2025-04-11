const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../../common');

// 设置日志级别为 debug
process.env.LOG_LEVEL = 'debug';

// 导入角色常量
const ROLES = {
  ADMIN_ROLE: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  MANAGER_ROLE: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08',
  OPERATOR_ROLE: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
};

/**
 * 获取钱包实例
 */
function getWallet(role) {
    // 根据角色获取私钥
    let privateKey;
    switch (role) {
        case 'admin':
            privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
            break;
        case 'manager':
            privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
            break;
        case 'operator':
            privateKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
            break;
        default:
            throw new Error(`未知角色: ${role}`);
    }
    
    // 创建钱包
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    return new ethers.Wallet(privateKey, provider);
}

/**
 * 加载合约 ABI
 */
function loadContractAbi(contractName) {
    const abiPath = path.join(__dirname, `../../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    
    if (!fs.existsSync(abiPath)) {
        throw new Error(`找不到合约 ABI 文件: ${abiPath}`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.abi;
}

/**
 * 获取最新的部署报告
 */
function getLatestDeploymentReport() {
    try {
        Logger.info('获取最新部署报告...');
        const reportsDir = path.join(__dirname, '../../deployment-reports');
        
        // 检查目录是否存在
        if (!fs.existsSync(reportsDir)) {
            throw new Error(`部署报告目录不存在: ${reportsDir}`);
        }
        
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

        Logger.info(`找到最新部署报告: ${files[0]}`);
        const reportPath = path.join(reportsDir, files[0]);
        const latestReport = fs.readFileSync(reportPath, 'utf8');
        
        // 打印报告片段
        const reportPreview = latestReport.substring(0, 500) + '...';
        Logger.info(`部署报告内容预览: ${reportPreview}`);
        
        // 从部署报告中提取合约地址
        const systemAddressMatch = latestReport.match(/RealEstateSystem\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
        const propertyManagerAddressMatch = latestReport.match(/PropertyManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
        const tradingManagerAddressMatch = latestReport.match(/TradingManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
        const rewardManagerAddressMatch = latestReport.match(/RewardManager\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
        const facadeAddressMatch = latestReport.match(/RealEstateFacade\s*\n\s*-\s*地址:\s*(0x[a-fA-F0-9]{40})/);
        
        // 检查是否成功提取所有地址
        if (!systemAddressMatch) {
            Logger.error('未找到 RealEstateSystem 合约地址');
        }
        if (!propertyManagerAddressMatch) {
            Logger.error('未找到 PropertyManager 合约地址');
        }
        if (!tradingManagerAddressMatch) {
            Logger.error('未找到 TradingManager 合约地址');
        }
        if (!rewardManagerAddressMatch) {
            Logger.error('未找到 RewardManager 合约地址');
        }
        if (!facadeAddressMatch) {
            Logger.error('未找到 RealEstateFacade 合约地址');
        }
        
        if (!systemAddressMatch || !propertyManagerAddressMatch || !tradingManagerAddressMatch || 
            !rewardManagerAddressMatch || !facadeAddressMatch) {
            throw new Error('部署报告中缺少合约地址信息');
        }

        const addresses = {
            systemAddress: systemAddressMatch[1],
            propertyManagerAddress: propertyManagerAddressMatch[1],
            tradingManagerAddress: tradingManagerAddressMatch[1],
            rewardManagerAddress: rewardManagerAddressMatch[1],
            facadeAddress: facadeAddressMatch[1]
        };
        
        Logger.info('成功提取合约地址', addresses);
        return addresses;
    } catch (error) {
        Logger.error('获取部署报告失败', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * 检查网络连接
 */
async function checkNetworkConnection() {
    try {
        Logger.info('正在检查网络连接...');
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        
        const network = await provider.getNetwork();
        Logger.info(`连接到网络成功: Chain ID ${network.chainId}, Network: ${network.name}`);
        
        const blockNumber = await provider.getBlockNumber();
        Logger.info(`当前区块高度: ${blockNumber}`);
        
        return true;
    } catch (error) {
        Logger.error('网络连接失败', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * 检查系统状态和角色权限
 */
async function checkSystemAndRoles(facadeContract, wallet) {
    try {
        Logger.info('检查系统状态和角色权限...');
        
        // 获取系统合约地址
        const systemAddress = await facadeContract.system();
        Logger.info(`系统合约地址: ${systemAddress}`);
        
        if (!systemAddress) {
            throw new Error('无法获取系统合约地址，合约系统属性为空');
        }
        
        // 加载系统合约 ABI
        const systemAbi = loadContractAbi('RealEstateSystem');
        const systemContract = new ethers.Contract(systemAddress, systemAbi, wallet);
        
        // 1. 检查系统状态
        const status = await systemContract.getSystemStatus();
        Logger.info(`系统状态: ${status}`);
        
        if (Number(status) !== 2) { // 2 表示 Active 状态
            Logger.info('系统未处于 Active 状态，正在激活系统...');
            // 获取 admin 钱包
            const adminWallet = getWallet('admin');
            // 使用 admin 钱包激活系统
            await systemContract.connect(adminWallet).setSystemStatus(2);
            Logger.info('系统已激活');
        }
        
        // 2. 检查钱包是否有 MANAGER_ROLE 权限
        const hasManagerRole = await systemContract.hasRole(ROLES.MANAGER_ROLE, wallet.address);
        Logger.info(`钱包 ${wallet.address} 是否有 MANAGER_ROLE 权限: ${hasManagerRole}`);
        
        if (!hasManagerRole) {
            Logger.info('正在授予钱包 MANAGER_ROLE 权限...');
            const adminWallet = getWallet('admin');
            await systemContract.connect(adminWallet).grantRole(ROLES.MANAGER_ROLE, wallet.address);
            Logger.info('已授予钱包 MANAGER_ROLE 权限');
        }
        
        // 3. 检查合约是否已授权
        const isContractAuthorized = await systemContract.authorizedContracts(facadeContract.target);
        Logger.info(`合约 ${facadeContract.target} 是否已授权: ${isContractAuthorized}`);
        
        if (!isContractAuthorized) {
            Logger.info('正在授权合约...');
            const adminWallet = getWallet('admin');
            await systemContract.connect(adminWallet).setContractAuthorization(facadeContract.target, true);
            Logger.info('已授权合约');
        }
        
        return systemContract;
    } catch (error) {
        Logger.error('检查系统状态和角色权限失败', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * 调用合约方法
 */
async function callContractMethods(contract, wallet) {
    try {
        Logger.info('调用 getVersion 方法...');
        const version = await contract.getVersion();
        Logger.info(`合约版本: ${version.toString()}`);
        
        // 生成随机房产ID以避免冲突
        const randomId = `test-property-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        Logger.info(`使用随机房产ID: ${randomId}`);
        
        Logger.info('调用 registerPropertyAndCreateToken 方法...');
        const tx = await contract.connect(wallet).registerPropertyAndCreateToken(
            randomId,
            'Japan',
            'https://example.com/metadata/random',
            1000000,
            'Test Property Token Random',
            'TPTR'
        );
        Logger.info('交易已发送，等待确认...');
        
        // 避免直接序列化交易收据（包含 BigInt）
        const receipt = await tx.wait();
        Logger.info(`交易已确认，交易哈希: ${receipt.hash}`);
        
        return true;
    } catch (error) {
        // 避免直接序列化错误对象，手动提取需要的信息
        Logger.error('调用合约方法失败:', { 
            errorMessage: error.message,
            errorCode: error.code,
            errorReason: error.reason,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * 使用指定角色的钱包调用合约
 */
async function callContractWithRoleWallet(role) {
    try {
        Logger.info(`使用 ${role} 角色的钱包调用合约...`);
        
        // 1. 获取钱包
        const wallet = getWallet(role);
        Logger.info(`获取到钱包: ${wallet.address}`);
        
        // 2. 网络连接检查
        await checkNetworkConnection();
        
        // 3. 获取合约地址
        const { facadeAddress } = getLatestDeploymentReport();
        Logger.info(`获取到 RealEstateFacade 合约地址: ${facadeAddress}`);
        
        // 4. 加载合约 ABI
        const facadeAbi = loadContractAbi('RealEstateFacade');
        Logger.info('ABI 加载成功');
        
        // 5. 创建合约实例
        const facadeContract = new ethers.Contract(facadeAddress, facadeAbi, wallet);
        Logger.info('合约实例创建成功');
        
        // 6. 检查系统状态和角色权限
        await checkSystemAndRoles(facadeContract, wallet);
        
        // 7. 调用合约方法
        await callContractMethods(facadeContract, wallet);
        
        Logger.info('合约调用成功');
        return true;
    } catch (error) {
        Logger.error('使用角色钱包调用合约失败', { error: error.message, stack: error.stack });
        throw error;
    }
}

/**
 * 主程序入口
 */
async function main() {
    try {
        Logger.info('开始执行测试脚本...');
        
        // 使用 operator 角色钱包调用合约
        await callContractWithRoleWallet('operator');
        
        Logger.info('测试成功完成!');
        process.exit(0);
    } catch (error) {
        // 避免直接序列化错误对象，手动提取需要的信息
        Logger.error('测试失败', { 
            errorMessage: error.message,
            errorCode: error.code,
            errorReason: error.reason,
            stack: error.stack
        });
        process.exit(1);
    }
}

// 执行主程序
main(); 