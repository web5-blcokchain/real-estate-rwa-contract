const express = require('express');
const router = express.Router();
const { checkAuth } = require('../../middleware/auth');
const RoleController = require('../../controllers/core/RoleController');
const controller = new RoleController();

/**
 * @swagger
 * tags:
 *   name: Role
 *   description: 角色管理API
 */

/**
 * @swagger
 * /api/v1/core/roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve a list of all roles
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: A list of roles
 *       400:
 *         description: Error message
 */
router.get('/', checkAuth, async (req, res) => {
  try {
    const result = await controller.getRoles();
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/core/roles/{roleId}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve details of a specific role
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         description: ID of the role to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role details
 *       400:
 *         description: Error message
 */
router.get('/:roleId', checkAuth, async (req, res) => {
  try {
    const { roleId } = req.params;
    const result = await controller.getRole(roleId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/core/roles/members/{role}:
 *   get:
 *     summary: Get role members
 *     description: Retrieve all members of a specific role
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of role members
 *       400:
 *         description: Error message
 */
router.get('/members/:role', checkAuth, async (req, res) => {
  try {
    const { role } = req.params;
    const result = await controller.getRoleMembers(role);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/core/roles/has-role/{role}/{account}:
 *   get:
 *     summary: Check if account has role
 *     description: Check if a specific account has a particular role
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         description: Account address
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Boolean result indicating if account has role
 *       400:
 *         description: Error message
 */
router.get('/has-role/:role/:account', checkAuth, async (req, res) => {
  try {
    const { role, account } = req.params;
    const result = await controller.hasRole(role, account);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/core/roles/grant/{role}/{account}:
 *   post:
 *     summary: Grant role to account
 *     description: Grant a role to a specific account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         description: Account address
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success message
 *       400:
 *         description: Error message
 */
router.post('/grant/:role/:account', checkAuth, async (req, res) => {
  try {
    const { role, account } = req.params;
    const result = await controller.grantRole(role, account);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/core/roles/revoke/{role}/{account}:
 *   post:
 *     summary: Revoke role from account
 *     description: Revoke a role from a specific account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         description: Role ID
 *         schema:
 *           type: string
 *       - in: path
 *         name: account
 *         required: true
 *         description: Account address
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success message
 *       400:
 *         description: Error message
 */
router.post('/revoke/:role/:account', checkAuth, async (req, res) => {
  try {
    const { role, account } = req.params;
    const result = await controller.revokeRole(role, account);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 