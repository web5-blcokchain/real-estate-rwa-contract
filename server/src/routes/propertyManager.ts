import { Router } from 'express';
import { 
  registerProperty, 
  getPropertyInfo, 
  updatePropertyInfo, 
  getAllProperties 
} from '../controllers/propertyManagerController';

const router = Router();

/**
 * @swagger
 * /api/property-manager/register:
 *   post:
 *     summary: 注册新房产
 *     description: 创建新的房产记录并发行对应的代币
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
 *               - location
 *               - area
 *               - description
 *               - initialSupply
 *               - managerPrivateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "PROP001"
 *               location:
 *                 type: string
 *                 description: 房产位置
 *                 example: "东京都新宿区1-1-1"
 *               area:
 *                 type: number
 *                 description: 房产面积（平方米）
 *                 example: 100
 *               description:
 *                 type: string
 *                 description: 房产描述
 *                 example: "高级公寓，靠近地铁站"
 *               initialSupply:
 *                 type: number
 *                 description: 初始代币供应量
 *                 example: 1000
 *               decimals:
 *                 type: number
 *                 description: 代币小数位数
 *                 example: 18
 *               managerPrivateKey:
 *                 type: string
 *                 description: 管理员私钥
 *                 example: "0xabcd..."
 *     responses:
 *       200:
 *         description: 成功注册房产
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/register', registerProperty);

/**
 * @swagger
 * /api/property-manager/properties/{propertyId}:
 *   get:
 *     summary: 获取房产信息
 *     description: 获取指定房产的详细信息
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产ID
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回房产信息
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 房产不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/properties/:propertyId', getPropertyInfo);

/**
 * @swagger
 * /api/property-manager/properties/{propertyId}/{field}:
 *   get:
 *     summary: 获取房产特定字段信息
 *     description: 获取指定房产的特定字段信息
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产ID
 *       - in: path
 *         name: field
 *         required: true
 *         schema:
 *           type: string
 *         description: 字段名称
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回字段信息
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 房产不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/properties/:propertyId/:field', getPropertyInfo);

/**
 * @swagger
 * /api/property-manager/update:
 *   post:
 *     summary: 更新房产信息
 *     description: 更新指定房产的特定字段信息
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
 *               - field
 *               - value
 *               - managerPrivateKey
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产ID
 *                 example: "PROP001"
 *               field:
 *                 type: string
 *                 description: 字段名称
 *                 example: "description"
 *               value:
 *                 type: string
 *                 description: 新值
 *                 example: "豪华公寓，靠近地铁站，周边设施完善"
 *               managerPrivateKey:
 *                 type: string
 *                 description: 管理员私钥
 *                 example: "0xabcd..."
 *     responses:
 *       200:
 *         description: 成功更新房产信息
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/update', updatePropertyInfo);

/**
 * @swagger
 * /api/property-manager/properties:
 *   get:
 *     summary: 获取所有房产列表
 *     description: 获取系统中所有注册的房产列表
 *     parameters:
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回房产列表
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/properties', getAllProperties);

export default router;