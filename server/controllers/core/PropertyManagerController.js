const { AddressUtils } = require('../../../common');
const Logger = require('../../../common/logger');
const Utils = require('../../../common/utils');
const { ResponseUtils } = require('../../utils');
const BaseController = require('../BaseController');
const { ethers } = require('ethers');
const { ContractUtils } = require('../../../common/blockchain');

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
        
        // 打印请求参数
        console.log("\n[registerProperty] 调用参数:");
        console.log("propertyDetails:", propertyDetails);
        if (propertyDetails) {
            console.log("propertyId:", propertyDetails.propertyId);
            console.log("propertyId 类型:", typeof propertyDetails.propertyId);
            console.log("propertyId 长度:", propertyDetails.propertyId ? propertyDetails.propertyId.length : 0);
            console.log("country:", propertyDetails.country);
            console.log("metadataURI:", propertyDetails.metadataURI);
        }
        
        // 验证参数
        if (!this.validateRequired(res, { propertyDetails })) {
            return;
        }

        // 提取属性并验证
        const { propertyId, country, metadataURI } = propertyDetails;
        if (!this.validateRequired(res, { propertyId, country, metadataURI })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                try {
                    console.log("[registerProperty] 准备获取合约实例...");
                    // 首先获取合约实例以检查钱包地址和角色
                    const contractAdmin = this.getContract('PropertyManager', 'admin');
                    console.log("[registerProperty] 已获取admin合约实例");
                    console.log("[registerProperty] contractAdmin:", contractAdmin);
                    console.log("[registerProperty] contractAdmin.runner:", contractAdmin.runner);
                    const contractManager = this.getContract('PropertyManager', 'manager');
                    console.log("[registerProperty] 已获取manager合约实例");
                    console.log("[registerProperty] contractManager:", contractManager);
                    console.log("[registerProperty] contractManager.runner:", contractManager.runner);
                    
                    console.log("[registerProperty] 准备获取钱包地址...");
                    // 获取钱包地址
                    const adminWallet = await contractAdmin.runner.getAddress();
                    console.log("[registerProperty] 已获取admin钱包地址:", adminWallet);
                    const managerWallet = await contractManager.runner.getAddress();
                    console.log("[registerProperty] 已获取manager钱包地址:", managerWallet);
                    
                    // 尝试获取MANAGER_ROLE常量和检查权限
                    try {
                        console.log("[registerProperty] 获取系统合约实例用于角色检查...");
                        // 使用System合约进行角色检查（不再使用RoleManager）
                        const systemContract = this.getContract('RealEstateSystem', 'admin');
                        console.log("[registerProperty] 已获取系统合约实例");
                        
                        console.log("[registerProperty] 准备获取MANAGER_ROLE常量...");
                        const managerRole = await systemContract.MANAGER_ROLE();
                        console.log("[registerProperty] MANAGER_ROLE:", managerRole);
                        
                        console.log("[registerProperty] 准备检查钱包是否有MANAGER_ROLE...");
                        // 检查钱包是否有管理者角色
                        const isManager = await systemContract.hasRole(managerRole, managerWallet);
                        console.log("[registerProperty] 当前钱包是否有MANAGER_ROLE:", isManager);
                    } catch (error) {
                        console.log("[registerProperty] 获取MANAGER_ROLE失败:", error.message);
                        console.log("[registerProperty] 错误堆栈:", error.stack);
                    }
                    
                    console.log("[registerProperty] 准备使用manager角色获取合约实例...");
                    // 获取合约实例，使用manager角色
                    const contract = contractManager;
                    console.log("[registerProperty] 已获取contract实例");
                    
                    console.log("[registerProperty] 准备调用合约registerProperty方法...");
                    // 直接使用原始propertyId字符串，不做任何转换
                    console.log("[registerProperty] 调用合约 registerProperty，传入参数:", propertyId, country, metadataURI);
                    const tx = await contract.registerProperty(propertyId, country, metadataURI);
                    console.log("[registerProperty] 交易发送成功，返回的交易信息:", tx);
                    
                    console.log("[registerProperty] 准备等待交易确认...");
                    // 等待交易确认
                    const receipt = await this.waitForTransaction(tx);
                    console.log("[registerProperty] 交易已确认，收据:", receipt);
                    
                    // 验证注册成功
                    try {
                        // 尝试获取房产是否存在 - 使用相同的propertyId字符串
                        const exists = await contract.propertyExists(propertyId);
                        console.log("[registerProperty] 房产是否存在:", exists);
                        
                        // 尝试直接查询房产详情 - 使用相同的propertyId字符串
                        try {
                            console.log("[registerProperty] 尝试获取房产详情");
                            const propDetails = await contract.getPropertyDetails(propertyId);
                            console.log("[registerProperty] 成功获取房产详情:", propDetails);
                        } catch (detailsError) {
                            console.log("[registerProperty] 获取房产详情失败:", detailsError.message);
                        }
                    } catch (error) {
                        console.log("[registerProperty] 验证注册失败:", error.message);
                    }

                    return {
                        transactionHash: receipt.hash,
                        propertyDetails
                    };
                } catch (error) {
                    console.log("[registerProperty] 错误详情:", error);
                    if (error.code) console.log("[registerProperty] 错误代码:", error.code);
                    if (error.reason) console.log("[registerProperty] 错误原因:", error.reason);
                    if (error.data) console.log("[registerProperty] 错误数据:", error.data);
                    throw error;
                }
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
        
        // 打印请求参数
        console.log("\n[getPropertyInfo] 调用参数:");
        console.log("propertyId:", propertyId);
        console.log("propertyId 类型:", typeof propertyId);
        console.log("propertyId 长度:", propertyId ? propertyId.length : 0);
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                try {
                    // 获取合约实例
                    const contract = this.getContract('PropertyManager', 'admin');

                    // 直接使用propertyId字符串，不做任何转换
                    console.log("[getPropertyInfo] 调用合约 getPropertyStatus，传入参数:", propertyId);
                    const status = await contract.getPropertyStatus(propertyId);
                    console.log("[getPropertyInfo] 获取到的状态:", status);

                    // 检查属性是否已批准 - 同样直接使用propertyId字符串
                    console.log("[getPropertyInfo] 调用合约 isPropertyApproved，传入参数:", propertyId);
                    const isApproved = await contract.isPropertyApproved(propertyId);
                    console.log("[getPropertyInfo] 房产是否已批准:", isApproved);

                    // 检查属性是否存在 - 直接使用propertyId字符串
                    console.log("[getPropertyInfo] 调用合约 propertyExists，传入参数:", propertyId);
                    const exists = await contract.propertyExists(propertyId);
                    console.log("[getPropertyInfo] 房产是否存在:", exists);

                    return {
                        propertyId,
                        exists,
                        status,
                        isApproved
                    };
                } catch (error) {
                    console.log("[getPropertyInfo] 发生错误:", error.message);
                    throw error;
                }
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
        
        // 打印请求参数
        console.log("\n[updatePropertyStatus] 调用参数:");
        console.log("propertyId:", propertyId);
        console.log("propertyId 类型:", typeof propertyId);
        console.log("propertyId 长度:", propertyId ? propertyId.length : 0);
        console.log("newStatus:", newStatus);
        console.log("newStatus 类型:", typeof newStatus);
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId, newStatus })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例，需要管理者权限
                const contract = this.getContract('PropertyManager', 'manager');
                
                // 确保newStatus是数字类型
                const parsedStatus = parseInt(newStatus);
                console.log("[updatePropertyStatus] 解析后的状态值:", parsedStatus);
                
                // 使用原始propertyId字符串和数字类型的状态值
                console.log("[updatePropertyStatus] 调用合约 updatePropertyStatus，传入参数:", propertyId, parsedStatus);
                const tx = await contract.updatePropertyStatus(propertyId, parsedStatus);
                
                // 等待交易确认
                const receipt = await this.waitForTransaction(tx);

                return {
                    transactionHash: receipt.hash,
                    propertyId,
                    newStatus: parsedStatus
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
                // 获取合约实例，使用管理者权限 - transferPropertyOwnership 需要 onlyManager 修饰器
                const contract = this.getContract('PropertyManager', 'manager');
                
                // 首先检查该属性是否存在
                console.log("[transferPropertyOwnership] 检查属性是否存在:", propertyId);
                const exists = await contract.propertyExists(propertyId);
                
                if (!exists) {
                    throw new Error(`房产不存在: ${propertyId}`);
                }
                
                // 调用合约方法
                console.log("[transferPropertyOwnership] 调用合约 transferPropertyOwnership，传入参数:", propertyId, newOwner);
                const tx = await contract.transferPropertyOwnership(propertyId, newOwner);
                console.log("[transferPropertyOwnership] 交易发送成功:", tx.hash);
                
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
                const contract = this.getContract('PropertyManager', 'admin');
                
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
        
        // 打印请求参数
        console.log("\n[getPropertyDetails] 调用参数:");
        console.log("propertyId:", propertyId);
        console.log("propertyId 类型:", typeof propertyId);
        console.log("propertyId 长度:", propertyId ? propertyId.length : 0);
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                try {
                    // 获取合约实例
                    const contract = this.getContract('PropertyManager', 'admin');
                    
                    // 首先检查该属性是否存在 - 直接使用propertyId字符串，不做任何转换
                    console.log("[getPropertyDetails] 检查属性是否存在:", propertyId);
                    const exists = await contract.propertyExists(propertyId);
                    
                    if (!exists) {
                        throw new Error(`房产不存在: ${propertyId}`);
                    }
                    
                    // 直接使用propertyId字符串调用合约方法
                    console.log("[getPropertyDetails] 调用合约 getPropertyDetails，传入参数:", propertyId);
                    const property = await contract.getPropertyDetails(propertyId);
                    console.log("[getPropertyDetails] 获取到的属性详情:", property);

                    // 获取代币地址 - 同样直接使用propertyId字符串
                    console.log("[getPropertyDetails] 获取代币地址");
                    const tokenAddress = await contract.propertyTokens(propertyId);
                    console.log("[getPropertyDetails] 代币地址:", tokenAddress);

                    return {
                        propertyId,
                        exists,
                        details: {
                            status: property[0],
                            registrationTime: property[1],
                            country: property[2],
                            metadataURI: property[3],
                            tokenAddress: property[4]
                        }
                    };
                } catch (error) {
                    console.log("[getPropertyDetails] 发生错误:", error.message);
                    if (error.code) console.log("[getPropertyDetails] 错误代码:", error.code);
                    if (error.data) console.log("[getPropertyDetails] 错误数据:", error.data);
                    throw error;
                }
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
        
        // 打印请求参数
        console.log("\n[setPropertyToken] 调用参数:");
        console.log("propertyId:", propertyId);
        console.log("propertyId 类型:", typeof propertyId);
        console.log("propertyId 长度:", propertyId ? propertyId.length : 0);
        console.log("tokenAddress:", tokenAddress);
        
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
                // 获取合约实例 - registerTokenForProperty 使用 onlyAuthorized 修饰器，可以是 admin、manager 或授权合约
                const contract = this.getContract('PropertyManager', 'manager');
                
                // 直接使用propertyId字符串，不进行任何转换
                console.log("[setPropertyToken] 调用合约 registerTokenForProperty，传入参数:", propertyId, tokenAddress);
                const tx = await contract.registerTokenForProperty(propertyId, tokenAddress);
                
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
        
        // 打印请求参数
        console.log("\n[getPropertyToken] 调用参数:");
        console.log("propertyId:", propertyId);
        console.log("propertyId 类型:", typeof propertyId);
        console.log("propertyId 长度:", propertyId ? propertyId.length : 0);
        
        // 验证参数
        if (!this.validateRequired(res, { propertyId })) {
            return;
        }

        await this.handleContractAction(
            res,
            async () => {
                try {
                    // 获取合约实例
                    const contract = this.getContract('PropertyManager', 'admin');
                    
                    // 首先检查该属性是否存在 - 直接使用propertyId字符串，不做任何转换
                    console.log("[getPropertyToken] 检查属性是否存在:", propertyId);
                    const exists = await contract.propertyExists(propertyId);
                    
                    if (!exists) {
                        throw new Error(`房产不存在: ${propertyId}`);
                    }
                    
                    // 直接使用propertyId字符串获取代币地址
                    console.log("[getPropertyToken] 调用合约 propertyTokens，传入参数:", propertyId);
                    const tokenAddress = await contract.propertyTokens(propertyId);
                    console.log("[getPropertyToken] 获取到的代币地址:", tokenAddress);

                    return {
                        propertyId,
                        exists,
                        tokenAddress
                    };
                } catch (error) {
                    console.log("[getPropertyToken] 发生错误:", error.message);
                    throw error;
                }
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
                const contract = this.getContract('PropertyManager', 'admin');
                
                // 调用合约方法
                console.log("[verifyPropertyOwnership] 调用合约 verifyPropertyOwnership，传入参数:", propertyId, owner);
                const isOwner = await contract.verifyPropertyOwnership(propertyId, owner);
                console.log("[verifyPropertyOwnership] 是否拥有者:", isOwner);

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

    /**
     * 获取所有房产（分页）
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async getProperties(req, res) {
        // 获取查询参数
        let { offset, limit, status } = req.query;
        
        // 设置默认值并转换为数字
        offset = parseInt(offset) || 0;
        limit = parseInt(limit) || 10;
        
        // 确保参数合理
        if (offset < 0) offset = 0;
        if (limit <= 0) limit = 10;
        if (limit > 100) limit = 100; // 限制最大返回数量，避免过大的请求
        
        // 验证状态参数（如果提供了）
        if (status !== undefined) {
            status = parseInt(status);
            if (isNaN(status) || status < 0 || status > 4) { // 根据PropertyStatus枚举的范围
                return ResponseUtils.sendError(res, '无效的状态值', 400);
            }
        }
        
        await this.handleContractAction(
            res,
            async () => {
                // 获取合约实例
                const contract = this.getContract('PropertyManager', 'admin');
                
                let result;
                if (status !== undefined) {
                    // 如果指定了状态，调用按状态筛选的方法
                    console.log(`[getProperties] 按状态 ${status} 获取房产，offset: ${offset}, limit: ${limit}`);
                    result = await contract.getPropertiesByStatus(status, offset, limit);
                    
                    // 解构结果
                    const [totalCount, hashes, countries, tokenAddresses] = result;
                    console.log(`[getProperties] 总匹配数: ${totalCount}, 返回数量: ${hashes.length}`);
                    
                    // 格式化返回结果
                    const properties = [];
                    for (let i = 0; i < hashes.length; i++) {
                        properties.push({
                            hash: hashes[i],
                            country: countries[i],
                            tokenAddress: tokenAddresses[i]
                        });
                    }
                    
                    return {
                        totalCount: totalCount.toNumber(),
                        offset,
                        limit,
                        count: properties.length,
                        status,
                        properties
                    };
                } else {
                    // 如果没有指定状态，获取所有房产
                    console.log(`[getProperties] 获取所有房产，offset: ${offset}, limit: ${limit}`);
                    result = await contract.getPropertiesPaginated(offset, limit);
                    
                    // 解构结果
                    const [totalCount, hashes, statuses, countries, tokenAddresses] = result;
                    console.log(`[getProperties] 总数: ${totalCount}, 返回数量: ${hashes.length}`);
                    
                    // 格式化返回结果
                    const properties = [];
                    for (let i = 0; i < hashes.length; i++) {
                        properties.push({
                            hash: hashes[i],
                            status: statuses[i],
                            country: countries[i],
                            tokenAddress: tokenAddresses[i]
                        });
                    }
                    
                    return {
                        totalCount: totalCount.toNumber(),
                        offset,
                        limit,
                        count: properties.length,
                        properties
                    };
                }
            },
            '获取房产列表成功',
            { offset, limit, status },
            '获取房产列表失败'
        );
    }
}

module.exports = PropertyManagerController; 