/**
 * 不动产管理路由
 */
const { Router } = require('express');
const { 
  registerProperty, 
  getPropertyInfo, 
  updatePropertyInfo, 
  getAllProperties,
  registerPropertyAndToken 
} = require('../controllers/propertyManagerController');

const router = Router();

/**
 * @swagger
 * /api/property-manager/register:
 *   post:
 *     summary: 注册新房产
 *     description: 注册一个新的房产并创建对应的代币
 *     tags: [房产管理]
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
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               location:
 *                 type: string
 *                 description: 房产位置
 *                 example: "东京都新宿区西新宿1-1-1"
 *               area:
 *                 type: number
 *                 description: 房产面积（平方米）
 *                 example: 120.5
 *               description:
 *                 type: string
 *                 description: 房产描述
 *                 example: "高层公寓，临近车站，设施齐全"
 *               initialSupply:
 *                 type: string
 *                 description: 代币初始供应量
 *                 example: "1000"
 *               decimals:
 *                 type: number
 *                 description: 代币精度
 *                 default: 18
 *                 example: 18
 *               managerRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "manager"
 *                 example: "manager"
 *     responses:
 *       200:
 *         description: 成功注册房产
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
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0xabcd..."
 *                     transaction:
 *                       type: string
 *                       example: "0x1234..."
 *                     message:
 *                       type: string
 *                       example: "已成功注册房产 P12345"
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
 * /api/property-manager/register-property-token:
 *   post:
 *     summary: 注册新房产并创建代币
 *     description: 注册一个新的房产并创建对应的代币
 *     tags: [房产管理]
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
 *               - country
 *               - metadataURI
 *               - tokenName
 *               - tokenSymbol
 *               - initialSupply
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               country:
 *                 type: string
 *                 description: 房产所在国家
 *                 example: "Japan"
 *               metadataURI:
 *                 type: string
 *                 description: 房产元数据URI
 *                 example: "https://api.example.com/metadata/P12345"
 *               tokenName:
 *                 type: string
 *                 description: 代币名称
 *                 example: "Property Token P12345"
 *               tokenSymbol:
 *                 type: string
 *                 description: 代币符号
 *                 example: "PROP12345"
 *               initialSupply:
 *                 type: string
 *                 description: 代币初始供应量
 *                 example: "1000"
 *               managerRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "admin"
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: 成功注册房产和代币
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
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     propertyIdHash:
 *                       type: string
 *                       example: "0x1234..."
 *                     tokenAddress:
 *                       type: string
 *                       example: "0xabcd..."
 *                     tokenName:
 *                       type: string
 *                       example: "Property Token P12345"
 *                     tokenSymbol:
 *                       type: string
 *                       example: "PROP12345"
 *                     initialSupply:
 *                       type: string
 *                       example: "1000"
 *                     transactionHash:
 *                       type: string
 *                       example: "0xefgh..."
 *                     network:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "localhost"
 *                         chainId:
 *                           type: number
 *                           example: 31337
 *                         isTestnet:
 *                           type: boolean
 *                           example: false
 *                         isMainnet:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/register-property-token', registerPropertyAndToken);

/**
 * @swagger
 * /api/property-manager/{propertyId}:
 *   get:
 *     summary: 获取房产信息
 *     description: 获取指定房产的详细信息
 *     tags: [房产管理]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产唯一标识符
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回房产信息
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
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0xabcd..."
 *                     location:
 *                       type: string
 *                       example: "东京都新宿区西新宿1-1-1"
 *                     area:
 *                       type: number
 *                       example: 120.5
 *                     description:
 *                       type: string
 *                       example: "高层公寓，临近车站，设施齐全"
 *                     token:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Property Token P12345"
 *                         symbol:
 *                           type: string
 *                           example: "PROP12345"
 *                         totalSupply:
 *                           type: string
 *                           example: "1000.0"
 *                         decimals:
 *                           type: number
 *                           example: 18
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 房产不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:propertyId', getPropertyInfo);

/**
 * @swagger
 * /api/property-manager/{propertyId}/{field}:
 *   get:
 *     summary: 获取房产特定字段信息
 *     description: 获取指定房产的特定字段信息
 *     tags: [房产管理]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: 房产唯一标识符
 *       - in: path
 *         name: field
 *         required: true
 *         schema:
 *           type: string
 *         description: 字段名称（location, area, description等）
 *       - in: query
 *         name: api_key
 *         required: true
 *         schema:
 *           type: string
 *         description: API密钥
 *     responses:
 *       200:
 *         description: 成功返回房产字段信息
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
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     tokenAddress:
 *                       type: string
 *                       example: "0xabcd..."
 *                     field:
 *                       type: string
 *                       example: "东京都新宿区西新宿1-1-1"
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 房产不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:propertyId/:field', getPropertyInfo);

/**
 * @swagger
 * /api/property-manager/update:
 *   post:
 *     summary: 更新房产信息
 *     description: 更新指定房产的特定字段信息
 *     tags: [房产管理]
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
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: 房产唯一标识符
 *                 example: "P12345"
 *               field:
 *                 type: string
 *                 description: 要更新的字段名
 *                 example: "description"
 *               value:
 *                 type: string
 *                 description: 新的字段值
 *                 example: "更新后的房产描述，增加了新设施"
 *               managerRole:
 *                 type: string
 *                 description: 管理员角色名称
 *                 default: "manager"
 *                 example: "manager"
 *     responses:
 *       200:
 *         description: 成功更新房产信息
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
 *                     propertyId:
 *                       type: string
 *                       example: "P12345"
 *                     field:
 *                       type: string
 *                       example: "description"
 *                     value:
 *                       type: string
 *                       example: "更新后的房产描述，增加了新设施"
 *                     transaction:
 *                       type: string
 *                       example: "0x1234..."
 *                     message:
 *                       type: string
 *                       example: "已成功更新房产 P12345 的 description 为 更新后的房产描述，增加了新设施"
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
 * /api/property-manager/all:
 *   get:
 *     summary: 获取所有房产信息
 *     description: 获取系统中所有已注册房产的列表
 *     tags: [房产管理]
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           propertyId:
 *                             type: string
 *                             example: "P12345"
 *                           tokenAddress:
 *                             type: string
 *                             example: "0xabcd..."
 *                           location:
 *                             type: string
 *                             example: "东京都新宿区西新宿1-1-1"
 *                           area:
 *                             type: number
 *                             example: 120.5
 *                           description:
 *                             type: string
 *                             example: "高层公寓，临近车站，设施齐全"
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/all', getAllProperties);

module.exports = router; 