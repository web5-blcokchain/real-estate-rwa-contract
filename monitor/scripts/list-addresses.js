#!/usr/bin/env node

/**
 * 列出监控地址的脚本
 * 用法:
 * 1. 列出所有地址：yarn list-addresses
 * 2. 列出指定类型的地址：yarn list-addresses -- --type CONTRACT
 */

// 加载环境变量
require('dotenv').config({ path: '../.env' });

const { createLogger } = require('../src/utils/logger');
const db = require('../src/db');
const addressService = require('../src/services/address');
const models = require('../src/db/models');

const logger = createLogger('list-addresses-script');

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let addressType = null;
    
    // 解析 --type 参数
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--type' && i + 1 < args.length) {
        addressType = args[i + 1].toUpperCase();
        
        // 验证地址类型
        if (!Object.values(models.address.ADDRESS_TYPES).includes(addressType)) {
          console.error(`错误: 无效的地址类型 ${addressType}`);
          console.error(`有效的类型: ${Object.values(models.address.ADDRESS_TYPES).join(', ')}`);
          process.exit(1);
        }
        
        break;
      }
    }
    
    // 初始化数据库
    await db.initDatabase();
    logger.info('数据库已连接');
    
    // 获取地址列表
    const addresses = await addressService.getAddresses(addressType);
    
    if (addresses.length === 0) {
      console.log('没有找到监控地址');
    } else {
      console.log(`找到 ${addresses.length} 个监控地址${addressType ? ` (类型: ${addressType})` : ''}:`);
      console.log('-'.repeat(100));
      console.log('| ID  | 地址                                      | 类型          | 标签                | 最后区块号   | 同步状态 |');
      console.log('-'.repeat(100));
      
      addresses.forEach(addr => {
        const id = addr.id.toString().padEnd(4);
        const address = addr.address.padEnd(42);
        const type = addr.address_type.padEnd(13);
        const label = (addr.label || '').slice(0, 18).padEnd(19);
        const blockNumber = addr.last_block_number.toString().padEnd(11);
        const syncStatus = addr.is_syncing ? '同步中' : '已完成';
        
        console.log(`| ${id}| ${address}| ${type}| ${label}| ${blockNumber}| ${syncStatus} |`);
      });
      
      console.log('-'.repeat(100));
    }
    
    // 关闭数据库连接
    await db.closeDatabase();
  } catch (error) {
    logger.error('获取地址列表失败', { error: error.message });
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main(); 