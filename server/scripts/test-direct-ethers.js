const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('开始测试直接使用 ethers.js 加载合约...');

        // 1. 创建 provider
        const provider = new ethers.JsonRpcProvider('http://localhost:8545');
        console.log('Provider 创建成功');

        // 2. 创建钱包
        const adminKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        const adminWallet = new ethers.Wallet(adminKey, provider);
        console.log('Admin 钱包创建成功:', adminWallet.address);

        // 3. 加载 ABI
        const facadeAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateFacade.sol/RealEstateFacade.json');
        
        if (!fs.existsSync(facadeAbiPath)) {
            throw new Error('找不到合约 ABI 文件:' + facadeAbiPath);
        }
        
        const facadeArtifact = JSON.parse(fs.readFileSync(facadeAbiPath, 'utf8'));
        const facadeAbi = facadeArtifact.abi;
        console.log('ABI 加载成功，函数数量:', Object.keys(facadeAbi.filter(item => item.type === 'function')).length);

        // 4. 加载合约地址
        const facadeAddress = '0xf98Dff28d2A4B3B676204d0B4163CA6fb59F53Dd';
        console.log('合约地址:', facadeAddress);

        // 5. 创建合约实例
        const facadeContract = new ethers.Contract(facadeAddress, facadeAbi, adminWallet);
        console.log('合约实例创建成功');

        // 6. 调用合约方法
        const version = await facadeContract.getVersion();
        console.log('合约版本:', version);

        // 7. 获取系统状态
        const systemAddress = await facadeContract.system();
        console.log('系统合约地址:', systemAddress);

        // 加载系统合约 ABI
        const systemAbiPath = path.join(__dirname, '../../artifacts/contracts/RealEstateSystem.sol/RealEstateSystem.json');
        
        if (!fs.existsSync(systemAbiPath)) {
            throw new Error('找不到系统合约 ABI 文件:' + systemAbiPath);
        }
        
        const systemArtifact = JSON.parse(fs.readFileSync(systemAbiPath, 'utf8'));
        const systemAbi = systemArtifact.abi;
        
        // 创建系统合约实例
        const systemContract = new ethers.Contract(systemAddress, systemAbi, adminWallet);
        
        // 获取系统状态
        const systemStatus = await systemContract.getSystemStatus();
        console.log('系统状态:', systemStatus);
        
        // 如果系统状态不是 Active(2)，则激活系统
        if (systemStatus !== 2) {
            console.log('系统状态不是 Active，正在激活系统...');
            const tx = await systemContract.setSystemStatus(2);
            await tx.wait();
            console.log('系统已激活');
            const newStatus = await systemContract.getSystemStatus();
            console.log('新的系统状态:', newStatus);
        }
        
        // 8. 检查操作员权限
        const operatorAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
        const operatorRole = '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'; // OPERATOR_ROLE
        const hasOperatorRole = await systemContract.hasRole(operatorRole, operatorAddress);
        console.log('操作员是否有 OPERATOR_ROLE:', hasOperatorRole);
        
        // 9. 尝试授权门面合约
        const facadeAuthorized = await systemContract.authorizedContracts(facadeAddress);
        console.log('门面合约是否已授权:', facadeAuthorized);
        
        if (!facadeAuthorized) {
            console.log('门面合约未授权，正在授权...');
            const tx = await systemContract.setContractAuthorization(facadeAddress, true);
            await tx.wait();
            console.log('门面合约已授权');
        }
        
        // 10. 尝试注册一个房产
        console.log('尝试注册房产...');
        const registerTx = await facadeContract.registerPropertyAndCreateToken(
            'test-property-direct',
            'Japan',
            'https://example.com/metadata/direct',
            1000000,
            'Direct Test Property Token',
            'DTPT'
        );
        console.log('注册房产交易已发送:', registerTx.hash);
        
        const receipt = await registerTx.wait();
        console.log('注册房产交易已确认:', receipt.hash);
        
        console.log('测试成功!');
    } catch (error) {
        console.error('测试失败:', error);
        // 输出详细的错误信息
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            reason: error.reason,
            data: error.data
        });
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('程序执行失败:', error);
        process.exit(1);
    }); 