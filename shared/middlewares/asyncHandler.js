/**
 * 异步处理器中间件
 * 捕获异步路由处理器中的错误并传递给错误处理中间件
 */

/**
 * 异步处理器包装函数
 * @param {Function} fn 异步路由处理函数
 * @returns {Function} Express中间件函数
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler }; 