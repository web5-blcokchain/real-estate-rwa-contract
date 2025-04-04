/**
 * 测试控制器 - 用于验证Swagger文档生成
 * @swagger
 * tags:
 *   name: Test
 *   description: 测试API端点
 */

const { Logger } = require('../../../shared/src');

/**
 * 测试端点
 * 
 * @swagger
 * /api/v1/test:
 *   get:
 *     summary: 测试API端点
 *     description: 返回一个简单的测试消息，验证API服务器运行正常
 *     tags: [Test]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API测试成功"
 *       401:
 *         description: 未授权
 */
function testEndpoint(req, res) {
  Logger.info('API测试端点被调用');
  return res.json({
    success: true,
    message: 'API测试成功',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  testEndpoint
}; 