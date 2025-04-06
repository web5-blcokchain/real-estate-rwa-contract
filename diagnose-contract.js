// diagnose-contract.js
require('dotenv').config();
const { Contract, Provider, Logger, ErrorHandler } = require('./shared/src');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// 设置日志级别为debug
Logger.configure({ level: 'debug', console: true });

async function diagnose() {
  console.log('===== 开始诊断Contract模块 =====');
  
  try {
    // 步骤1: 检查ethers.js版本
    console.log(`\n1. Ethers.js版本: ${ethers.version}`);
    
    // 步骤2: 测试Provider创建
    console.log('\n2. 测试Provider创建');
    const provider = await Provider.create();
    console.log('✓ Provider创建成功');
    console.log(`网络信息: chainId=${(await provider.getNetwork()).chainId}`);
    
    // 步骤3: 获取合约信息
    console.log('\n3. 获取合约信息');
    const contractNames = ['RealEstateFacade', 'RealEstateSystem'];
    
    for (const contractName of contractNames) {
      console.log(`\n--- 检查合约: ${contractName} ---`);
      // 检查各种可能的环境变量名
      const possibleEnvNames = [
        `CONTRACT_${contractName.toUpperCase()}_ADDRESS`,
        `CONTRACT_${contractName}_ADDRESS`,
        `CONTRACT_FACADE_ADDRESS`,
        `CONTRACT_SYSTEM_ADDRESS`
      ];
      
      let address = null;
      let usedEnvName = null;
      
      for (const envName of possibleEnvNames) {
        if (process.env[envName]) {
          address = process.env[envName];
          usedEnvName = envName;
          break;
        }
      }
      
      console.log(`合约地址: ${address || '未找到'}`);
      if (address) {
        console.log(`使用的环境变量: ${usedEnvName}`);
      } else {
        console.log('尝试过的环境变量:', possibleEnvNames.join(', '));
      }
      
      // 步骤4: 查找ABI
      console.log('\n4. 查找合约ABI');
      const possiblePaths = [
        path.join(process.cwd(), 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`),
        path.join(process.cwd(), 'build', 'contracts', `${contractName}.json`),
        path.join(process.cwd(), 'abi', `${contractName}.json`)
      ];
      
      let abi;
      let abiPath;
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          console.log(`找到ABI文件: ${p}`);
          abiPath = p;
          const data = JSON.parse(fs.readFileSync(p, 'utf8'));
          abi = data.abi;
          break;
        } else {
          console.log(`未找到ABI文件: ${p}`);
        }
      }
      
      if (!abi && address) {
        console.log('尝试使用hardhat artifacts目录查找');
        const artifactsDir = path.join(process.cwd(), 'artifacts');
        let found = false;
        
        // 递归查找ABI文件
        function findAbiFile(dir, name) {
          if (!fs.existsSync(dir)) return null;
          
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              const result = findAbiFile(filePath, name);
              if (result) return result;
            } else if (file.endsWith('.json')) {
              try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data.abi && (file.includes(name) || file.includes(name.replace('RealEstate', '')))) {
                  return { path: filePath, abi: data.abi };
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
          return null;
        }
        
        const result = findAbiFile(artifactsDir, contractName);
        if (result) {
          console.log(`找到ABI文件: ${result.path}`);
          abiPath = result.path;
          abi = result.abi;
          found = true;
        }
        
        if (!found) {
          console.log('无法找到ABI文件，尝试创建基本ABI');
          // 创建一个基本的ABI作为测试
          abi = [
            {
              "inputs": [],
              "name": "system",
              "outputs": [{"type": "string"}],
              "stateMutability": "view",
              "type": "function"
            }
          ];
          console.log('使用基本ABI:', JSON.stringify(abi));
        }
      }
      
      if (!address || !abi) {
        console.log('缺少必要信息，跳过合约检查');
        continue;
      }
      
      // 步骤5: 使用Contract模块创建合约
      console.log('\n5. 使用Contract模块创建合约');
      try {
        console.log('尝试创建只读合约实例...');
        const contractInstance = await Contract.createReadOnly(provider, address, abi);
        console.log('✓ Contract模块创建合约成功');
        console.log('合约元数据:', contractInstance._metadata);
        
        // 测试调用
        if (contractInstance.system) {
          try {
            const result = await contractInstance.system();
            console.log('✓ 调用system()方法成功:', result);
          } catch (callError) {
            console.error('✗ 调用system()方法失败:', callError.message);
          }
        } else {
          console.log('合约没有system()方法');
        }
      } catch (err) {
        console.error('✗ Contract模块创建合约失败:');
        console.error(err.message);
        
        if (err.stack) {
          console.error('\n错误堆栈:');
          console.error(err.stack);
        }
        
        // 检查关键错误类型
        console.log('\n错误类型分析:');
        if (err.message.includes('invalid address')) {
          console.log('- 地址格式无效');
        }
        if (err.message.includes('invalid abi')) {
          console.log('- ABI格式无效');
        }
        if (err.message.includes('CALL_EXCEPTION')) {
          console.log('- 合约调用异常，可能合约不存在或地址错误');
        }
        
        // 检查Validation错误
        try {
          const { Validation } = require('./shared/src/utils');
          console.log('\n验证测试:');
          console.log('地址验证结果:', Validation.isValidAddress(address));
          console.log('ABI验证结果:', Validation.isValidAbi(abi));
        } catch (validationError) {
          console.log('验证模块测试失败:', validationError.message);
        }
      }
      
      // 步骤6: 直接使用ethers.js
      console.log('\n6. 直接使用ethers.js创建合约');
      try {
        console.log('尝试创建合约实例...');
        const ethersContract = new ethers.Contract(address, abi, provider);
        console.log('✓ Ethers.js创建合约成功');
        
        // 尝试调用方法
        if (ethersContract.system) {
          try {
            const result = await ethersContract.system();
            console.log('✓ 调用system()方法成功:', result);
          } catch (callError) {
            console.error('✗ 调用system()方法失败:', callError.message);
          }
        } else {
          console.log('合约没有system()方法，列出可用方法:');
          // 列出可用方法
          for (const fn in ethersContract.functions) {
            if (fn !== 'signer' && fn !== 'provider') {
              console.log(`- ${fn}`);
            }
          }
        }
      } catch (err) {
        console.error('✗ Ethers.js创建合约失败:');
        console.error(err.message);
        
        if (err.stack) {
          console.error('\n错误堆栈:');
          console.error(err.stack);
        }
      }
    }
    
  } catch (error) {
    console.error('诊断过程中发生错误:');
    console.error(error);
  }
  
  console.log('\n===== 诊断完成 =====');
}

diagnose();