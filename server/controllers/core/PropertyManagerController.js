const { AddressUtils } = require('../../../common');
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
        const { propertyDetails } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyDetails })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = this.getContract('admin');
                
                // 调用合约方法 - 根据实际ABI移除 initialOwner 参数
                const tx = await contract.registerProperty(propertyDetails);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyDetails
                };
            },
            '房产注册成功',
            { propertyDetails },
            '房产注册失败'
        );
    }

    /**
     * 获取房产信息
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getPropertyInfo(req, res) {
        const { propertyId } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = this.getContract('admin');
                
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
        const { propertyId, newStatus } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId, newStatus })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例，需要管理者权限
                const contract = this.getContract('manager');
                
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
        const { propertyId, newOwner } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId, newOwner })) {
            return;
        }

        // 验证地址格式
        if (!AddressUtils.isValid(newOwner)) {
            return ResponseUtils.sendError(res, '无效的地址格式', 400);
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例，使用管理员权限
                const contract = this.getContract('admin');
                
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
        const { owner } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { owner })) {
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
                const contract = this.getContract('admin');
                
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
        const { propertyId } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = this.getContract('admin');
                
                // 调用合约方法
                const property = await contract.getPropertyDetails(propertyId);

                return {
                    propertyId,
                    details: property
                };
            },
            '获取房产详情成功',
            { propertyId },
            '获取房产详情失败'
        );
    }

    /**
     * 设置房产代币
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async setPropertyToken(req, res) {
        const { propertyId, tokenAddress } = req.body;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId, tokenAddress })) {
            return;
        }

        // 验证地址格式
        if (!AddressUtils.isValid(tokenAddress)) {
            return ResponseUtils.sendError(res, '无效的地址格式', 400);
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例，使用管理员权限
                const contract = this.getContract('admin');
                
                // 调用合约方法
                const tx = await contract.setPropertyToken(propertyId, tokenAddress);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyId,
                    tokenAddress
                };
            },
            '房产代币设置成功',
            { propertyId, tokenAddress },
            '房产代币设置失败'
        );
    }

    /**
     * 获取房产代币
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getPropertyToken(req, res) {
        const { propertyId } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = this.getContract('admin');
                
                // 调用合约方法
                const tokenAddress = await contract.getPropertyToken(propertyId);

                return {
                    propertyId,
                    tokenAddress
                };
            },
            '获取房产代币成功',
            { propertyId },
            '获取房产代币失败'
        );
    }

    /**
     * 验证房产所有权
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async verifyPropertyOwnership(req, res) {
        const { propertyId, owner } = req.params;
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId, owner })) {
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
                const contract = this.getContract('admin');
                
                // 调用合约方法
                const isOwner = await contract.verifyPropertyOwnership(propertyId, owner);

                return {
                    propertyId,
                    owner,
                    isOwner
                };
            },
            '验证房产所有权成功',
            { propertyId, owner },
            '验证房产所有权失败'
        );
    }
}

module.exports = PropertyManagerController; 