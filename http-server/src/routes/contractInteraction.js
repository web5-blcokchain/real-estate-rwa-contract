/**
 * 合约交互路由
 */
const { Router } = require('express');
const { getContractHelpers, logger } = require('../utils');

const router = Router();

/**
 * @swagger
 * /api/contract/call:
 *   post:
 *     summary: 调用智能合约方法
 *     description: 通用接口，用于调用合约的只读方法
 *     tags: [合约交互]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractName
 *               - method
 *             properties:
 *               contractName:
 *                 type: string
 *                 description: 合约名称
 *                 example: "PropertyManager"
 *               method:
 *                 type: string
 *                 description: 方法名称
 *                 example: "getPropertyInfo"
 *               args:
 *                 type: array
 *                 description: 方法参数
 *                 example: ["P12345", "location"]
 *     responses:
 *       200:
 *         description: 成功调用合约
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {result: "东京都新宿区西新宿1-1-1"}
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/call', async (req, res) => {
  try {
    const { contractName, method, args = [] } = req.body;
    
    if (!contractName || !method) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '必须提供合约名称和方法名称'
      });
    }
    
    // 获取合约实例
    const { getContractInstance } = getContractHelpers;
    const contract = await getContractInstance(contractName);
    
    if (!contract) {
      return res.status(400).json({
        success: false,
        error: '合约不存在',
        message: `未找到名为 ${contractName} 的合约`
      });
    }
    
    // 检查方法是否存在
    if (!contract[method]) {
      return res.status(400).json({
        success: false,
        error: '方法不存在',
        message: `合约 ${contractName} 没有名为 ${method} 的方法`
      });
    }
    
    // 调用合约方法
    const result = await contract[method](...args);
    
    return res.status(200).json({
      success: true,
      data: { result }
    });
  } catch (error) {
    logger.error('调用合约方法失败:', error);
    return res.status(500).json({
      success: false,
      error: '调用合约方法失败',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/contract/transaction:
 *   post:
 *     summary: 执行合约交易
 *     description: 通用接口，用于执行合约的写入方法（交易）
 *     tags: [合约交互]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractName
 *               - method
 *               - role
 *             properties:
 *               contractName:
 *                 type: string
 *                 description: 合约名称
 *                 example: "PropertyManager"
 *               method:
 *                 type: string
 *                 description: 方法名称
 *                 example: "registerProperty"
 *               args:
 *                 type: array
 *                 description: 方法参数
 *                 example: ["P12345", "东京都新宿区西新宿1-1-1", 120.5, "高层公寓，临近车站，设施齐全", "1000000000000000000", 18]
 *               role:
 *                 type: string
 *                 description: 执行交易的角色
 *                 example: "manager"
 *     responses:
 *       200:
 *         description: 成功执行合约交易
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionHash:
 *                       type: string
 *                       example: "0x1234..."
 *                     blockNumber:
 *                       type: number
 *                       example: 12345
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/transaction', async (req, res) => {
  try {
    const { contractName, method, args = [], role = 'manager' } = req.body;
    
    if (!contractName || !method) {
      return res.status(400).json({
        success: false,
        error: '参数错误',
        message: '必须提供合约名称和方法名称'
      });
    }
    
    // 获取合约实例并执行交易
    const { getContractWithOptions, executeTransaction } = getContractHelpers;
    
    // 获取带签名者的合约实例
    const contract = await getContractWithOptions({
      contractName,
      role
    });
    
    if (!contract) {
      return res.status(400).json({
        success: false,
        error: '合约不存在',
        message: `未找到名为 ${contractName} 的合约`
      });
    }
    
    // 检查方法是否存在
    if (!contract[method]) {
      return res.status(400).json({
        success: false,
        error: '方法不存在',
        message: `合约 ${contractName} 没有名为 ${method} 的方法`
      });
    }
    
    // 执行合约交易
    const receipt = await executeTransaction(contract, method, args);
    
    return res.status(200).json({
      success: true,
      data: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        events: receipt.logs.map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        }).filter(Boolean)
      }
    });
  } catch (error) {
    logger.error('执行合约交易失败:', error);
    return res.status(500).json({
      success: false,
      error: '执行合约交易失败',
      message: error.message
    });
  }
});

module.exports = router; 