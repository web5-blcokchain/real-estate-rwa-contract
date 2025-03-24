/**
 * 异步处理包装器
 * 捕获异步中间件中的错误并传递给错误处理中间件
 * @param {function} fn 异步函数
 * @returns {function} 包装后的函数
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler }; 