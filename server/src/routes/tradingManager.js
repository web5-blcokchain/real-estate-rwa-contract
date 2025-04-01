import { Router } from 'express';
import { 
  createOrder, 
  executeOrder, 
  cancelOrder, 
  getOrder, 
  getActiveOrders, 
  getUserOrders 
} from '../controllers/tradingManagerController';

const router = Router();

/**
 * @swagger
 * /api/trading-manager/create-order:
 *   post:
 *     summary:创建订单
 *     description:创建新的销售订单
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - token
 *               - amount
 *               - price
 *               - sellerPrivateKey
 *             properties:
 *               token:
 *                 type:
 *                 description:代币合约地址
 *                 example:"0x1234..."
 *               amount:
 *                 type:
 *                 description:代币数量
 *                 example:"10"
 *               price:
 *                 type:
 *                 description:单价（ETH）
 *                 example:"0.1"
 *               sellerPrivateKey:
 *                 type:
 *                 description:卖家私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功创建订单
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/create-order', createOrder);

/**
 * @swagger
 * /api/trading-manager/execute-order:
 *   post:
 *     summary:执行订单
 *     description:购买指定订单的代币
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - orderId
 *               - buyerPrivateKey
 *             properties:
 *               orderId:
 *                 type:
 *                 description:订单ID
 *                 example:"1"
 *               buyerPrivateKey:
 *                 type:
 *                 description:买家私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功执行订单
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/execute-order', executeOrder);

/**
 * @swagger
 * /api/trading-manager/cancel-order:
 *   post:
 *     summary:取消订单
 *     description:取消指定的销售订单
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     requestBody:
 *       required:
 *       content:
 *         application/json:
 *           schema:
 *             type:
 *             required:
 *               - orderId
 *               - sellerPrivateKey
 *             properties:
 *               orderId:
 *                 type:
 *                 description:订单ID
 *                 example:"1"
 *               sellerPrivateKey:
 *                 type:
 *                 description:卖家私钥
 *                 example:"0xabcd..."
 *     responses:
 *       200:
 *         description:成功取消订单
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.post('/cancel-order', cancelOrder);

/**
 * @swagger
 * /api/trading-manager/orders/{orderId}:
 *   get:
 *     summary:获取订单信息
 *     description:获取指定订单的详细信息
 *     parameters:
 *       - in:
 *         name:
 *         required:
 *         schema:
 *           type:
 *         description:订单ID
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回订单信息
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/orders/:orderId', getOrder);

/**
 * @swagger
 * /api/trading-manager/active-orders:
 *   get:
 *     summary:获取活跃订单列表
 *     description:获取所有当前活跃的销售订单
 *     parameters:
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回活跃订单列表
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/active-orders', getActiveOrders);

/**
 * @swagger
 * /api/trading-manager/user-orders/{address}:
 *   get:
 *     summary:获取用户订单列表
 *     description:获取指定用户创建的所有订单
 *     parameters:
 *       - in:
 *         name:
 *         required:
 *         schema:
 *           type:
 *         description:用户地址
 *       - in:
 *         name:_key
 *         required:
 *         schema:
 *           type:
 *         description:密钥
 *     responses:
 *       200:
 *         description:成功返回用户订单列表
 *       400:
 *         description:参数错误
 *       401:
 *         description:未授权
 *       500:
 *         description:服务器错误
 */
router.get('/user-orders/:address', getUserOrders);

export default router;
