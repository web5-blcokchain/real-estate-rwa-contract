#!/usr/bin/env node

/**
 * 更新合约ABI的脚本
 * 用法:
 * yarn update-abi <address> <abiFile>
 * 其中:
 * - address: 合约地址
 * - abiFile: ABI文件路径（JSON格式）
 */

// 加载环境变量
require('dotenv').config({ path: '../.env' });

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../src/utils/logger');
const db = require('../src/db');
const addressService = require('../src/services/address');

const logger = createLogger('update-abi-script');

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('用法: yarn update-abi <address> <abiFile>');
      console.error('示例: yarn update-abi 0x123... ./abis/MyContract.json');
      process.exit(1);
    }
    
    const address = args[0];
    const abiFilePath = args[1];
    
    // 检查文件是否存在
    if (!fs.existsSync(abiFilePath)) {
      console.error(`错误: ABI文件 ${abiFilePath} 不存在`);
      process.exit(1);
    }
    
    // 读取ABI文件
    let abi;
    try {
      const abiContent = fs.readFileSync(abiFilePath, 'utf8');
      abi = JSON.parse(abiContent);
    } catch (error) {
      console.error(`错误: 无法解析ABI文件 - ${error.message}`);
      process.exit(1);
    }
    
    // 初始化数据库
    await db.initDatabase();
    logger.info('数据库已连接');
    
    // 更新合约ABI
    const result = await addressService.updateContractAbi(address, abi);
    
    console.log(`合约 ${result.address} 的ABI已成功更新`);
    
    // 关闭数据库连接
    await db.closeDatabase();
  } catch (error) {
    logger.error('更新ABI失败', { error: error.message });
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main(); 