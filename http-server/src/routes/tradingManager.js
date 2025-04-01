import { Router } from 'express';
import { 
  createOrder, 
  executeOrder, 
  cancelOrder, 
  getAllOrders,
  getOrderById
} from '../controllers/tradingManagerController.js';

const router = Router();

/**
 * @swagger
 * /api/trading-manager/create:
 *   post:
 *     summary: 创建交易订单
 *     description: 创建一个新的房产代币交易订单
 *     tags: [交易管理]
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
 *               - propertyId
 *               - amount
 *               - price
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               amount:
 *                 type: string
 *                 description: 出售代币数量
 *                 example: "10"
 *               price:
 *                 type: string
 *                 description: 总价格（以ETH为单位）
 *                 example: "5"
 *               traderRole:
 *                 type: string
 *                 description: 交易者角色名称
 *                 default: "trader"
 *                 example: "trader"
 *     responses:
 *       200:
 *         description: 成功创建订单
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
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0xabcd..."
 *                     amount:
 *                       type: string
 *                       example: "10"
 *                     price:
 *                       type: string
 *                       example: "5"
 *                     transaction:
 *                       type: string
 *                       example: "0x1234..."
 *                     message:
 *                       type: string
 *                       example: "已成功创建订单，ID: 1"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 房产不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/create', createOrder);

/**
 * @swagger
 * /api/trading-manager/execute:
 *   post:
 *     summary: 执行交易订单
 *     description: 购买并执行一个现有的交易订单
 *     tags: [交易管理]
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
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: 订单ID
 *                 example: "1"
 *               traderRole:
 *                 type: string
 *                 description: 交易者角色名称
 *                 default: "trader"
 *                 example: "trader"
 *     responses:
 *       200:
 *         description: 成功执行订单
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
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     seller:
 *                       type: string
 *                       example: "0x1234..."
 *                     buyer:
 *                       type: string
 *                       example: "0x5678..."
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     amount:
 *                       type: string
 *                       example: "10"
 *                     price:
 *                       type: string
 *                       example: "5"
 *                     transaction:
 *                       type: string
 *                       example: "0xabcd..."
 *                     message:
 *                       type: string
 *                       example: "已成功执行订单 1"
 *       400:
 *         description: 参数错误或订单状态无效
 *       401:
 *         description: 未授权
 *       404:
 *         description: 订单不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/execute', executeOrder);

/**
 * @swagger
 * /api/trading-manager/cancel:
 *   post:
 *     summary: 取消交易订单
 *     description: 卖家取消一个现有的交易订单
 *     tags: [交易管理]
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
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: 订单ID
 *                 example: "1"
 *               traderRole:
 *                 type: string
 *                 description: 交易者角色名称
 *                 default: "trader"
 *                 example: "trader"
 *     responses:
 *       200:
 *         description: 成功取消订单
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
 *                     orderId:
 *                       type: string
 *                       example: "1"
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     transaction:
 *                       type: string
 *                       example: "0xabcd..."
 *                     message:
 *                       type: string
 *                       example: "已成功取消订单 1"
 *       400:
 *         description: 参数错误或订单状态无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足，非卖家无法取消订单
 *       404:
 *         description: 订单不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/cancel', cancelOrder);

/**
 * @swagger
 * /api/trading-manager/all:
 *   get:
 *     summary: 获取所有交易订单
 *     description: 获取系统中所有交易订单的列表
 *     tags: [交易管理]
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回订单列表
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
 *                     totalCount:
 *                       type: number
 *                       example: 2
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           orderId:
 *                             type: number
 *                             example: 1
 *                           seller:
 *                             type: string
 *                             example: "0x1234..."
 *                           propertyId:
 *                             type: string
 *                             example: "P12345"
 *                           amount:
 *                             type: string
 *                             example: "10"
 *                           price:
 *                             type: string
 *                             example: "5"
 *                           executed:
 *                             type: boolean
 *                             example: false
 *                           cancelled:
 *                             type: boolean
 *                             example: false
 *                           timestamp:
 *                             type: number
 *                             example: 1620000000
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/all', getAllOrders);

/**
 * @swagger
 * /api/trading-manager/{orderId}:
 *   get:
 *     summary: 获取特定订单信息
 *     description: 获取指定ID的交易订单详细信息
 *     tags: [交易管理]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: 订单ID
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回订单信息
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
 *                     orderId:
 *                       type: number
 *                       example: 1
 *                     seller:
 *                       type: string
 *                       example: "0x1234..."
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     amount:
 *                       type: string
 *                       example: "10"
 *                     price:
 *                       type: string
 *                       example: "5"
 *                     executed:
 *                       type: boolean
 *                       example: false
 *                     cancelled:
 *                       type: boolean
 *                       example: false
 *                     timestamp:
 *                       type: number
 *                       example: 1620000000
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 订单不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:orderId', getOrderById);

export default router; 