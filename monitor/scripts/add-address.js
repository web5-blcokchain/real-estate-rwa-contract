#!/usr/bin/env node

/**
 * 添加监控地址的脚本
 * 用法:
 * yarn add-address <address> <type> [label]
 * 其中:
 * - address: 以太坊地址
 * - type: 地址类型，可选值：EOA, CONTRACT, TOKEN_CONTRACT
 * - label: 地址标签（可选）
 */

// 加载环境变量
require('dotenv').config({ path: '../.env' });

const { createLogger } = require('../src/utils/logger');
const db = require('../src/db');
const addressService = require('../src/services/address');

const logger = createLogger('add-address-script');

async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('用法: yarn add-address <address> <type> [label]');
      console.error('示例: yarn add-address 0x123... CONTRACT "我的合约"');
      process.exit(1);
    }
    
    const address = args[0];
    const type = args[1].toUpperCase();
    const label = args[2] || '';
    
    // 初始化数据库
    await db.initDatabase();
    logger.info('数据库已连接');
    
    // 添加监控地址
    const result = await addressService.addAddress(address, type, label);
    
    console.log('地址添加成功:');
    console.log(`- 地址: ${result.address}`);
    console.log(`- 类型: ${result.type}`);
    console.log(`- 标签: ${result.label}`);
    
    // 关闭数据库连接
    await db.closeDatabase();
  } catch (error) {
    logger.error('添加地址失败', { error: error.message });
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 执行主函数
main(); 