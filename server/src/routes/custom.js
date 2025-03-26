/**
 * 自定义测试路由
 */
const express = require('express');
const router = express.Router();

// 模拟数据
const mockData = {
  properties: [
    { id: 'PROP001', name: '东京公寓 A', country: 'JP', status: 1 },
    { id: 'PROP002', name: '东京公寓 B', country: 'JP', status: 0 },
    { id: 'PROP003', name: '大阪别墅', country: 'JP', status: 1 }
  ],
  tokens: [
    { tokenAddress: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', propertyId: 'PROP001', name: 'Tokyo Apartment A', symbol: 'TKYA', decimals: 18, totalSupply: '1000000000000000000000' },
    { tokenAddress: '0xf6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5', propertyId: 'PROP003', name: 'Osaka Villa', symbol: 'OSKV', decimals: 18, totalSupply: '500000000000000000000' }
  ],
  rentDistributions: [
    { distributionId: '1', token: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', propertyId: 'PROP001', amount: '10000000000000000000', snapshotId: 0, rentPeriodStart: '2024-01-01T00:00:00.000Z', rentPeriodEnd: '2024-01-31T23:59:59.999Z', description: '2024年1月租金' },
    { distributionId: '2', token: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', propertyId: 'PROP001', amount: '12000000000000000000', snapshotId: 0, rentPeriodStart: '2024-02-01T00:00:00.000Z', rentPeriodEnd: '2024-02-29T23:59:59.999Z', description: '2024年2月租金' },
    { distributionId: '3', token: '0xf6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5', propertyId: 'PROP003', amount: '8000000000000000000', snapshotId: 0, rentPeriodStart: '2024-01-01T00:00:00.000Z', rentPeriodEnd: '2024-01-31T23:59:59.999Z', description: '2024年1月租金' }
  ],
  redemptionRequests: [
    { requestId: '1', token: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', requestor: '0x1234567890123456789012345678901234567890', amount: '100000000000000000000', status: 1, createdAt: '2024-02-15T10:30:00.000Z' },
    { requestId: '2', token: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', requestor: '0x2345678901234567890123456789012345678901', amount: '50000000000000000000', status: 0, createdAt: '2024-03-01T14:45:00.000Z' }
  ],
  supportedStablecoins: [
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'  // USDC
  ]
};

// ===== API解析器 - 将URL映射到合适的处理程序 =====
router.use((req, res, next) => {
  // 提取URL的路径部分
  const path = req.path;
  const originalUrl = req.originalUrl;
  // 判断请求针对哪个资源
  
  // 代币相关接口
  if (originalUrl.includes('/tokens')) {
    if (path === '/' || path === '') {
      // 获取所有代币
      return res.json({
        success: true,
        data: mockData.tokens
      });
    } else if (path.includes('/implementation')) {
      // 获取代币实现合约地址
      return res.json({
        success: true,
        data: {
          implementation: '0xabcdef1234567890abcdef1234567890abcdef12'
        }
      });
    } else if (path.match(/\/property\/\w+/)) {
      // 获取特定房产的代币
      const propertyId = path.split('/').pop();
      const token = mockData.tokens.find(t => t.propertyId === propertyId);
      
      if (token) {
        return res.json({
          success: true,
          data: token
        });
      } else {
        return res.status(404).json({
          success: false,
          error: {
            message: `未找到房产 ${propertyId} 的代币`
          }
        });
      }
    }
  }
  
  // 租金相关接口
  else if (originalUrl.includes('/rents')) {
    if (path === '/' || path === '') {
      // 获取所有租金分配记录
      return res.json({
        success: true,
        data: mockData.rentDistributions
      });
    } else if (path.match(/\/property\/\w+/)) {
      // 获取特定房产的租金分配记录
      const propertyId = path.split('/').pop();
      const distributions = mockData.rentDistributions.filter(d => d.propertyId === propertyId);
      
      return res.json({
        success: true,
        data: distributions
      });
    } else if (path.match(/\/\d+$/)) {
      // 获取特定租金分配记录
      const distributionId = path.split('/').pop();
      const distribution = mockData.rentDistributions.find(d => d.distributionId === distributionId);
      
      if (distribution) {
        return res.json({
          success: true,
          data: distribution
        });
      } else {
        return res.status(404).json({
          success: false,
          error: {
            message: `未找到租金分配记录 ID: ${distributionId}`
          }
        });
      }
    }
  }
  
  // 赎回相关接口
  else if (originalUrl.includes('/redemptions')) {
    if (path === '/' || path === '') {
      // 获取所有赎回请求
      return res.json({
        success: true,
        data: mockData.redemptionRequests
      });
    } else if (path.match(/\/stablecoin\/0x[a-fA-F0-9]+/)) {
      // 检查稳定币是否支持
      const stablecoinAddress = path.split('/').pop();
      const isSupported = mockData.supportedStablecoins.includes(stablecoinAddress);
      
      return res.json({
        success: true,
        data: {
          stablecoinAddress,
          isSupported
        }
      });
    } else if (path.match(/\/\d+$/)) {
      // 获取特定赎回请求
      const requestId = path.split('/').pop();
      const request = mockData.redemptionRequests.find(r => r.requestId === requestId);
      
      if (request) {
        return res.json({
          success: true,
          data: request
        });
      } else {
        return res.status(404).json({
          success: false,
          error: {
            message: `未找到赎回请求 ID: ${requestId}`
          }
        });
      }
    }
  }
  
  // 属性相关接口
  else if (originalUrl.includes('/properties')) {
    if (path === '/' || path === '') {
      // 获取所有房产
      return res.json({
        success: true,
        message: '自定义路由测试成功',
        data: mockData.properties
      });
    } else if (path.match(/\/PROP\d+$/)) {
      // 获取特定房产
      const id = path.split('/').pop();
      // 模拟找到的房产
      const property = {
        id,
        name: `测试房产 ${id.slice(-3)}`,
        country: 'JP',
        address: '东京都新宿区1-1-1',
        status: id === 'PROP002' ? 0 : 1,
        createdAt: new Date(Date.now() - 86400000), // 一天前
        updatedAt: new Date()
      };
      
      return res.json({
        success: true,
        data: property
      });
    } else {
      // 未找到的房产
      return res.status(404).json({
        success: false,
        error: {
          message: `未找到房产 ID: ${path.split('/').pop()}`
        }
      });
    }
  }
  
  // 如果没有匹配到任何规则，继续下一个中间件
  next();
});

// 导出路由器
module.exports = router; 