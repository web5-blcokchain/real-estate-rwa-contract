/**
 * Swagger 组件和模型定义
 * 定义通用的请求和响应模型，避免重复定义
 */

// 通用请求参数模型
/**
 * @swagger
 * components:
 *   schemas:
 *     PropertyIdParam:
 *       type: object
 *       required:
 *         - propertyId
 *       properties:
 *         propertyId:
 *           type: string
 *           description: 房产ID
 *           example: "PROP-12345"
 *
 *     PropertyRegistrationBody:
 *       type: object
 *       required:
 *         - propertyId
 *         - propertyData
 *         - tokenData
 *       properties:
 *         propertyId:
 *           type: string
 *           description: 房产ID
 *           example: "PROP-12345"
 *         propertyData:
 *           type: object
 *           required:
 *             - country
 *             - metadataURI
 *           properties:
 *             country:
 *               type: string
 *               description: 房产所在国家
 *               example: "Japan"
 *             metadataURI:
 *               type: string
 *               description: 房产元数据URI
 *               example: "https://example.com/metadata/PROP-12345"
 *             description:
 *               type: string
 *               description: 房产描述
 *               example: "位于东京的高档公寓"
 *             location:
 *               type: object
 *               properties:
 *                 city:
 *                   type: string
 *                   example: "Tokyo"
 *                 address:
 *                   type: string
 *                   example: "新宿区1-2-3"
 *                 coordinates:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: 35.6895
 *                     longitude:
 *                       type: number
 *                       example: 139.6917
 *         tokenData:
 *           type: object
 *           required:
 *             - name
 *             - symbol
 *             - initialSupply
 *           properties:
 *             name:
 *               type: string
 *               description: 代币名称
 *               example: "Tokyo Apartment Token"
 *             symbol:
 *               type: string
 *               description: 代币符号
 *               example: "TAT"
 *             initialSupply:
 *               type: string
 *               description: 初始供应量
 *               example: "1000000000000000000000"
 *
 *     PropertyStatusUpdateBody:
 *       type: object
 *       required:
 *         - propertyId
 *         - status
 *       properties:
 *         propertyId:
 *           type: string
 *           description: 房产ID
 *           example: "PROP-12345"
 *         status:
 *           type: integer
 *           description: 房产状态
 *           enum: [0, 1, 2, 3, 4, 5]
 *           example: 2
 *
 *     OrderCreationBody:
 *       type: object
 *       required:
 *         - token
 *         - amount
 *         - price
 *         - propertyId
 *       properties:
 *         token:
 *           type: string
 *           description: 代币合约地址
 *           example: "0x1234567890123456789012345678901234567890"
 *         amount:
 *           type: string
 *           description: 代币数量
 *           example: "1000000000000000000"
 *         price:
 *           type: string
 *           description: 单价
 *           example: "5000000000000000000"
 *         propertyId:
 *           type: string
 *           description: 相关房产ID
 *           example: "PROP-12345"
 *
 *     OrderIdParam:
 *       type: object
 *       required:
 *         - orderId
 *       properties:
 *         orderId:
 *           type: string
 *           description: 订单ID
 *           example: "1"
 *
 *     OrderExecutionBody:
 *       type: object
 *       required:
 *         - orderId
 *         - buyer
 *         - amount
 *       properties:
 *         orderId:
 *           type: string
 *           description: 订单ID
 *           example: "1"
 *         buyer:
 *           type: string
 *           description: 买方地址
 *           example: "0x1234567890123456789012345678901234567890"
 *         amount:
 *           type: string
 *           description: 购买数量
 *           example: "1000000000000000000"
 *
 * # 响应模型 
 *     PropertyRegistrationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             transactionHash:
 *               type: string
 *               description: 交易哈希
 *               example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *             propertyId:
 *               type: string
 *               description: 房产ID
 *               example: "PROP-12345"
 *
 *     PropertyStatusUpdateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             transactionHash:
 *               type: string
 *               description: 交易哈希
 *               example: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
 *             propertyId:
 *               type: string
 *               description: 房产ID
 *               example: "PROP-12345"
 *             status:
 *               type: integer
 *               description: 更新后的状态
 *               example: 2
 */

// 导出常用响应定义，便于在控制器中引用
const responses = {
  Success: {
    description: '操作成功',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Success'
        }
      }
    }
  },
  Error: {
    description: '操作失败',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/Error'
        }
      }
    }
  },
  NotFound: {
    description: '资源未找到',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: '未找到指定资源'
            }
          }
        }
      }
    }
  },
  BadRequest: {
    description: '请求参数错误',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: '请求参数错误'
            }
          }
        }
      }
    }
  }
};

module.exports = {
  responses
}; 