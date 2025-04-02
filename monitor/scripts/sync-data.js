#!/usr/bin/env node

/**
 * 同步区块链数据的脚本
 * 用法:
 * 1. 同步所有监控地址：yarn sync
 * 2. 同步指定地址：yarn sync -- --address 0x123...
 */

// 加载环境变量
require('dotenv').config({ path: '../.env' });

const { createLogger } = require('../src/utils/logger');
const db = require('../src/db');
const monitorService = require('../src/services/monitor');
const addressService = require('../src/services/address');

const logger = createLogger('sync-data-script');

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let address = null;
    
    // 解析 --address 参数
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--address' && i + 1 < args.length) {
        address = args[i + 1];
        break;
      }
    }
    
    // 初始化数据库
    await db.initDatabase();
    logger.info('数据库已连接');
    
    if (address) {
      // 同步指定地址
      console.log(`正在同步地址 ${address} 的数据...`);
      
      // 检查地址是否在监控列表中
      const addressInfo = await addressService.getAddresses();
      const exists = addressInfo.some(a => a.address.toLowerCase() === address.toLowerCase());
      
      if (!exists) {
        console.error(`错误: 地址 ${address} 不在监控列表中`);
        process.exit(1);
      }
      
      // 执行同步
      const result = await monitorService.syncAddress(address);
      
      console.log(`地址 ${result.address} 同步成功，同步至区块: ${result.syncedToBlock}`);
    } else {
      // 同步所有地址
      console.log('正在同步所有监控地址的数据...');
      
      // 执行同步
      await monitorService.syncData();
      
      console.log('所有地址同步完成');
    }
    
    // 关闭数据库连接
    await db.closeDatabase();
  } catch (error) {
    logger.error('同步数据失败', { error: error.message });
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main(); 