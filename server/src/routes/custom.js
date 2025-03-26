/**
 * 自定义测试路由
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '自定义路由测试成功',
    data: [
      { id: 'PROP001', name: '东京公寓 A', country: 'JP', status: 1 },
      { id: 'PROP002', name: '东京公寓 B', country: 'JP', status: 0 },
      { id: 'PROP003', name: '大阪别墅', country: 'JP', status: 1 }
    ]
  });
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  
  if (id && id.startsWith('PROP')) {
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
    
    res.json({
      success: true,
      data: property
    });
  } else {
    // 未找到的房产
    res.status(404).json({
      success: false,
      error: {
        message: `未找到房产 ID: ${id}`
      }
    });
  }
});

module.exports = router; 