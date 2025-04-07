const { ContractUtils, AddressUtils } = require('../../../common');
const Logger = require('../../../common/logger');
const Utils = require('../../../common/utils');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');

/**
 * 房产管理控制器
 */
class PropertyManagerController extends BaseController {
    /**
     * 注册房产
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async registerProperty(req, res) {
        const { contractAddress, propertyDetails, initialOwner } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress, propertyDetails, initialOwner })) {
            return;
        }

        // 验证地址格式
        if (!AddressUtils.isValid(initialOwner)) {
            return ResponseUtils.sendError(res, '无效的地址格式', 400);
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = ContractUtils.getContract('PropertyManager', contractAddress);
                
                // 调用合约方法
                const tx = await contract.registerProperty(propertyDetails, initialOwner);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyDetails,
                    initialOwner
                };
            },
            '房产注册成功',
            { propertyDetails, initialOwner },
            '房产注册失败'
        );
    }

    /**
     * 获取房产信息
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getPropertyInfo(req, res) {
        const { contractAddress } = req.query;
        const { propertyId } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress, propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = ContractUtils.getContract('PropertyManager', contractAddress);
                
                // 调用合约方法
                const propertyInfo = await contract.getPropertyInfo(propertyId);

                return {
                    propertyId,
                    propertyInfo
                };
            },
            '获取房产信息成功',
            { propertyId },
            '获取房产信息失败'
        );
    }

    /**
     * 更新房产状态
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async updatePropertyStatus(req, res) {
        const { contractAddress, propertyId, newStatus } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress, propertyId, newStatus })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = ContractUtils.getContract('PropertyManager', contractAddress);
                
                // 调用合约方法
                const tx = await contract.updatePropertyStatus(propertyId, newStatus);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyId,
                    newStatus
                };
            },
            '房产状态更新成功',
            { propertyId, newStatus },
            '房产状态更新失败'
        );
    }

    /**
     * 转移房产所有权
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async transferPropertyOwnership(req, res) {
        const { contractAddress, propertyId, newOwner } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress, propertyId, newOwner })) {
            return;
        }

        // 验证地址格式
        if (!AddressUtils.isValid(newOwner)) {
            return ResponseUtils.sendError(res, '无效的地址格式', 400);
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = ContractUtils.getContract('PropertyManager', contractAddress);
                
                // 调用合约方法
                const tx = await contract.transferPropertyOwnership(propertyId, newOwner);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyId,
                    newOwner
                };
            },
            '房产所有权转移成功',
            { propertyId, newOwner },
            '房产所有权转移失败'
        );
    }

    /**
     * 获取账户拥有的房产
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getOwnerProperties(req, res) {
        const { contractAddress } = req.query;
        const { owner } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { contractAddress, owner })) {
            return;
        }

        // 验证地址格式
        if (!AddressUtils.isValid(owner)) {
            return ResponseUtils.sendError(res, '无效的地址格式', 400);
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = ContractUtils.getContract('PropertyManager', contractAddress);
                
                // 调用合约方法
                const properties = await contract.getOwnerProperties(owner);

                return {
                    owner,
                    properties
                };
            },
            '获取账户房产成功',
            { owner },
            '获取账户房产失败'
        );
    }

    /**
     * 获取房产详情
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getPropertyDetails(req, res) {
        try {
            const { contractAddress } = req.query;
            const { propertyId } = req.params;
            
            // 验证参数
            if (!contractAddress || !propertyId) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数'
                });
            }

            // 获取合约实例
            const contract = ContractUtils.getContract('PropertyManager', contractAddress);
            
            // 调用合约方法
            const property = await contract.getPropertyDetails(propertyId);

            // 返回结果
            res.json({
                success: true,
                data: {
                    propertyId,
                    details: property
                }
            });
        } catch (error) {
            Logger.error('获取房产详情失败', error);
            res.status(500).json(Utils.handleContractError(error));
        }
    }

    /**
     * 设置房产代币
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setPropertyToken(req, res) {
        try {
            const { contractAddress, propertyId, tokenAddress } = req.body;
            
            // 验证参数
            if (!contractAddress || !propertyId || !tokenAddress) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数'
                });
            }

            // 验证地址格式
            if (!AddressUtils.isValid(tokenAddress)) {
                return res.status(400).json({
                    success: false,
                    error: '无效的地址格式'
                });
            }

            // 获取合约实例
            const contract = ContractUtils.getContract('PropertyManager', contractAddress);
            
            // 调用合约方法
            const tx = await contract.setPropertyToken(propertyId, tokenAddress);
            
            // 等待交易确认
            const receipt = await Utils.waitForTransaction(tx);

            // 记录日志
            Logger.info('房产代币设置成功', {
                propertyId,
                tokenAddress,
                transactionHash: receipt.hash
            });

            // 返回结果
            res.json({
                success: true,
                data: {
                    transactionHash: receipt.hash,
                    propertyId,
                    tokenAddress
                }
            });
        } catch (error) {
            Logger.error('房产代币设置失败', error);
            res.status(500).json(Utils.handleContractError(error));
        }
    }

    /**
     * 获取房产代币
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getPropertyToken(req, res) {
        try {
            const { contractAddress } = req.query;
            const { propertyId } = req.params;
            
            // 验证参数
            if (!contractAddress || !propertyId) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数'
                });
            }

            // 获取合约实例
            const contract = ContractUtils.getContract('PropertyManager', contractAddress);
            
            // 调用合约方法
            const tokenAddress = await contract.getPropertyToken(propertyId);

            // 返回结果
            res.json({
                success: true,
                data: {
                    propertyId,
                    tokenAddress
                }
            });
        } catch (error) {
            Logger.error('获取房产代币失败', error);
            res.status(500).json(Utils.handleContractError(error));
        }
    }

    /**
     * 验证房产所有权
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async verifyPropertyOwnership(req, res) {
        try {
            const { contractAddress } = req.query;
            const { propertyId, owner } = req.params;
            
            // 验证参数
            if (!contractAddress || !propertyId || !owner) {
                return res.status(400).json({
                    success: false,
                    error: '缺少必要参数'
                });
            }

            // 验证地址格式
            if (!AddressUtils.isValid(owner)) {
                return res.status(400).json({
                    success: false,
                    error: '无效的地址格式'
                });
            }

            // 获取合约实例
            const contract = ContractUtils.getContract('PropertyManager', contractAddress);
            
            // 调用合约方法
            const isOwner = await contract.verifyPropertyOwnership(propertyId, owner);

            // 返回结果
            res.json({
                success: true,
                data: {
                    propertyId,
                    owner,
                    isOwner
                }
            });
        } catch (error) {
            Logger.error('验证房产所有权失败', error);
            res.status(500).json(Utils.handleContractError(error));
        }
    }
}

module.exports = PropertyManagerController; 