const { validationResult, body, param, query } = require('express-validator');
const { ApiError } = require('../../../shared/utils/errors');

/**
 * 自定义验证错误处理中间件
 * 检查express-validator的验证结果，如果有错误则抛出ApiError
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => `${error.param}: ${error.msg}`).join(', ');
    throw new ApiError({
      message: `验证失败: ${errorMessages}`,
      statusCode: 400,
      code: 'BAD_REQUEST',
      details: { validationErrors: errors.array() }
    });
  }
  next();
};

/**
 * 区块链地址验证规则
 */
const isEthereumAddress = () => {
  return body()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('必须是有效的以太坊地址格式');
};

/**
 * 交易哈希验证规则
 */
const isTransactionHash = () => {
  return body()
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('必须是有效的交易哈希格式');
};

/**
 * 正整数验证规则
 */
const isPositiveInteger = () => {
  return body()
    .isInt({ min: 1 })
    .withMessage('必须是正整数');
};

/**
 * 验证规则集合
 */
const validators = {
  // 用户相关验证
  userValidators: {
    create: [
      body('wallet').isString().notEmpty().withMessage('钱包地址不能为空'),
      body('wallet').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('钱包地址格式不正确'),
      body('name').optional().isString().isLength({ min: 2, max: 50 }).withMessage('名称长度必须在2-50个字符之间'),
      body('email').optional().isEmail().withMessage('邮箱格式不正确'),
      validateRequest
    ],
    update: [
      param('id').isString().notEmpty().withMessage('用户ID不能为空'),
      body('name').optional().isString().isLength({ min: 2, max: 50 }).withMessage('名称长度必须在2-50个字符之间'),
      body('email').optional().isEmail().withMessage('邮箱格式不正确'),
      validateRequest
    ],
    getById: [
      param('id').isString().notEmpty().withMessage('用户ID不能为空'),
      validateRequest
    ]
  },
  
  // 代币相关验证
  tokenValidators: {
    create: [
      body('name').isString().notEmpty().withMessage('代币名称不能为空'),
      body('symbol').isString().notEmpty().withMessage('代币符号不能为空'),
      body('initialSupply').isInt({ min: 1 }).withMessage('初始供应量必须是正整数'),
      body('decimals').isInt({ min: 0, max: 18 }).withMessage('小数位数必须在0-18之间'),
      body('propertyId').isString().notEmpty().withMessage('资产ID不能为空'),
      validateRequest
    ],
    getById: [
      param('id').isString().notEmpty().withMessage('代币ID不能为空'),
      validateRequest
    ],
    transfer: [
      body('to').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('接收地址格式不正确'),
      body('amount').isNumeric().withMessage('金额必须是数字'),
      body('tokenAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      validateRequest
    ]
  },
  
  // 赎回相关验证
  redemptionValidators: {
    create: [
      body('tokenAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('代币地址格式不正确'),
      body('amount').isNumeric().withMessage('金额必须是数字'),
      body('userId').isString().notEmpty().withMessage('用户ID不能为空'),
      validateRequest
    ],
    approve: [
      param('id').isString().notEmpty().withMessage('赎回ID不能为空'),
      body('status').isIn(['approved', 'rejected']).withMessage('状态必须是approved或rejected'),
      validateRequest
    ],
    getById: [
      param('id').isString().notEmpty().withMessage('赎回ID不能为空'),
      validateRequest
    ],
    getByUser: [
      param('userId').isString().notEmpty().withMessage('用户ID不能为空'),
      validateRequest
    ]
  },
  
  // 通用分页查询参数验证
  paginationValidators: [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
    validateRequest
  ]
};

module.exports = {
  validateRequest,
  validators,
  // 导出单独的验证规则，方便自定义组合
  isEthereumAddress,
  isTransactionHash,
  isPositiveInteger
}; 