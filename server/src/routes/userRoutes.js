const BaseRouter = require('../../../shared/routes/baseRouter');
const UserController = require('../controllers/userController');
const { validators } = require('../middlewares/validator');

/**
 * 用户路由类
 */
class UserRouter extends BaseRouter {
  constructor() {
    super();
    this.setupRoutes();
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 获取所有用户
    this.get('/', validators.paginationValidators, UserController.getAllUsers);

    // 获取特定用户详情
    this.get('/:id', validators.userValidators.getById, UserController.getUserById);

    // 创建新用户
    this.post('/', validators.userValidators.create, UserController.createUser);

    // 更新用户信息
    this.put('/:id', validators.userValidators.update, UserController.updateUser, {
      auth: true
    });

    // 获取用户的代币余额
    this.get('/:id/tokens', [
      ...validators.userValidators.getById,
      validators.paginationValidators
    ], UserController.getUserTokens);

    // 获取用户的赎回请求
    this.get('/:id/redemptions', [
      ...validators.userValidators.getById,
      validators.paginationValidators
    ], UserController.getUserRedemptions);
  }
}

// 创建路由实例
const userRouter = new UserRouter();

module.exports = userRouter.getRouter(); 