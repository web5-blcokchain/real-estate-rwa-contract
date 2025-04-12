/**
 * 房产管理控制器
 * 负责处理与PropertyManager合约的交互
 */
const BaseController = require('../BaseController');
const { Logger } = require('../../../common');

class PropertyManagerController extends BaseController {
  /**
   * @swagger
   * /api/v1/core/property-manager/properties:
   *   get:
   *     summary: 获取所有房产ID
   *     description: 获取系统中所有已注册的房产ID列表
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     responses:
   *       200:
   *         description: 房产ID列表获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getAllPropertyIds(req, res) {
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        return {
          propertyIds: await contract.getAllPropertyIds()
        };
      },
      '获取所有房产ID成功',
      {},
      '获取所有房产ID失败'
    );
  }

  /**
   * @swagger
   * /api/v1/core/property-manager/properties/{propertyId}:
   *   get:
   *     summary: 获取房产详情
   *     description: 获取指定房产ID的详细信息
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: 房产ID
   *     responses:
   *       200:
   *         description: 房产详情获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       404:
   *         description: 房产不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async getPropertyDetails(req, res) {
    const { propertyId } = req.params;
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: '缺少房产ID参数'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const property = await contract.getProperty(propertyId);
        
        if (!property.exists) {
          return res.status(404).json({
            success: false,
            error: `房产不存在: ${propertyId}`
          });
        }
        
        const tokenAddress = await contract.propertyTokens(propertyId);
        const owner = await contract.propertyOwners(propertyId);
        
        return {
          propertyId: property.propertyId,
          status: property.status,
          registrationTime: property.registrationTime,
          country: property.country,
          metadataURI: property.metadataURI,
          tokenAddress,
          owner
        };
      },
      `获取房产详情成功: ${propertyId}`,
      { propertyId },
      `获取房产详情失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/property-manager/properties/status/{status}:
   *   get:
   *     summary: 根据状态获取房产
   *     description: 获取指定状态的所有房产ID
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: status
   *         required: true
   *         schema:
   *           type: integer
   *           enum: [0, 1, 2, 3, 4]
   *         description: 房产状态
   *     responses:
   *       200:
   *         description: 房产列表获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getPropertiesByStatus(req, res) {
    const status = parseInt(req.params.status);
    
    if (isNaN(status) || status < 0 || status > 4) {
      return res.status(400).json({
        success: false,
        error: '无效的状态参数，应为0-4之间的整数'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const propertyIds = await contract.getPropertiesByStatus(status);
        return { propertyIds, status };
      },
      `获取状态为${status}的房产列表成功`,
      { status },
      `获取状态为${status}的房产列表失败`
    );
  }

  /**
   * @swagger
   * /api/v1/core/property-manager/owner/{ownerAddress}/properties:
   *   get:
   *     summary: 获取所有者的房产
   *     description: 获取指定所有者拥有的所有房产ID
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: ownerAddress
   *         required: true
   *         schema:
   *           type: string
   *         description: 所有者地址
   *     responses:
   *       200:
   *         description: 房产列表获取成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   */
  async getOwnerProperties(req, res) {
    const { ownerAddress } = req.params;
    
    if (!ownerAddress || !ownerAddress.startsWith('0x') || ownerAddress.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的所有者地址'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const propertyIds = await contract.getOwnerProperties(ownerAddress);
        return { propertyIds, owner: ownerAddress };
      },
      `获取所有者${ownerAddress}的房产列表成功`,
      { ownerAddress },
      `获取所有者${ownerAddress}的房产列表失败`
    );
  }

  /**
   * @swagger
   * /api/v1/core/property-manager/update-property-status:
   *   put:
   *     summary: 更新房产状态
   *     description: 更新指定房产的状态，需要MANAGER权限
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - propertyId
   *               - status
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               status:
   *                 type: integer
   *                 enum: [0, 1, 2, 3, 4]
   *                 description: 新的房产状态
   *     responses:
   *       200:
   *         description: 房产状态更新成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误或合约错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async updatePropertyStatus(req, res) {
    const { propertyId, status } = req.body;
    
    if (!this.validateRequired(res, { propertyId, status })) {
      return;
    }
    
    if (isNaN(parseInt(status)) || status < 0 || status > 4) {
      return res.status(400).json({
        success: false,
        error: '无效的状态参数，应为0-4之间的整数'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract('manager');
        const tx = await contract.updatePropertyStatus(propertyId, status);
        const receipt = await this.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.transactionHash,
          propertyId,
          newStatus: status
        };
      },
      `更新房产状态成功: ${propertyId} -> ${status}`,
      { propertyId, status },
      `更新房产状态失败: ${propertyId}`
    );
  }

  /**
   * @swagger
   * /api/v1/core/property-manager/transfer-ownership:
   *   post:
   *     summary: 转移房产所有权
   *     description: 将房产所有权转移给新的所有者，需要当前所有者权限
   *     tags: [PropertyManager]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - propertyId
   *               - newOwner
   *             properties:
   *               propertyId:
   *                 type: string
   *                 description: 房产ID
   *               newOwner:
   *                 type: string
   *                 description: 新所有者的地址
   *     responses:
   *       200:
   *         description: 所有权转移成功
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       400:
   *         description: 参数错误或合约错误
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async transferOwnership(req, res) {
    const { propertyId, newOwner } = req.body;
    
    if (!this.validateRequired(res, { propertyId, newOwner })) {
      return;
    }
    
    if (!newOwner.startsWith('0x') || newOwner.length !== 42) {
      return res.status(400).json({
        success: false,
        error: '无效的新所有者地址'
      });
    }
    
    await this.handleContractAction(
      res,
      async () => {
        const contract = this.getContract();
        const tx = await contract.transferOwnership(propertyId, newOwner);
        const receipt = await this.waitForTransaction(tx);
        
        return {
          transactionHash: receipt.transactionHash,
          propertyId,
          newOwner
        };
      },
      `转移房产所有权成功: ${propertyId} -> ${newOwner}`,
      { propertyId, newOwner },
      `转移房产所有权失败: ${propertyId}`
    );
  }
}

module.exports = new PropertyManagerController(); 