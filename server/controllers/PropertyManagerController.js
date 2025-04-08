const ethers = require('ethers');

class PropertyManagerController {
    async verifyPropertyOwnership(req, res) {
        try {
            const { propertyId, ownerAddress } = req.body;
            
            // Validate required parameters
            if (!propertyId || !ownerAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID and owner address are required'
                });
            }

            // Convert propertyId to hash
            const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
            
            // Get contract instance
            const propertyManager = await this.getContractInstance();
            
            // Call the verify function
            const isOwner = await propertyManager.verifyPropertyOwnership(propertyIdHash, ownerAddress);
            
            return res.status(200).json({
                success: true,
                data: {
                    propertyId,
                    ownerAddress,
                    isOwner
                }
            });
        } catch (error) {
            console.error('Error verifying property ownership:', error);
            return res.status(500).json({
                success: false,
                message: 'Error verifying property ownership',
                error: error.message
            });
        }
    }

    async transferPropertyOwnership(req, res) {
        try {
            const { propertyId, newOwnerAddress } = req.body;
            
            // Validate required parameters
            if (!propertyId || !newOwnerAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Property ID and new owner address are required'
                });
            }

            // Convert propertyId to hash
            const propertyIdHash = ethers.keccak256(ethers.toUtf8Bytes(propertyId));
            
            // Get contract instance
            const propertyManager = await this.getContractInstance();
            
            // Call the transfer function
            const tx = await propertyManager.transferPropertyOwnership(propertyIdHash, newOwnerAddress);
            await tx.wait();
            
            return res.status(200).json({
                success: true,
                message: 'Property ownership transferred successfully',
                data: {
                    propertyId,
                    newOwnerAddress,
                    transactionHash: tx.hash
                }
            });
        } catch (error) {
            console.error('Error transferring property ownership:', error);
            return res.status(500).json({
                success: false,
                message: 'Error transferring property ownership',
                error: error.message
            });
        }
    }

    async getOwnerProperties(req, res) {
        try {
            const { ownerAddress } = req.params;
            
            // Validate required parameters
            if (!ownerAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Owner address is required'
                });
            }
            
            // Get contract instance
            const propertyManager = await this.getContractInstance();
            
            // Call the function to get owner properties
            const propertyHashes = await propertyManager.getOwnerProperties(ownerAddress);
            
            return res.status(200).json({
                success: true,
                data: {
                    ownerAddress,
                    propertyHashes
                }
            });
        } catch (error) {
            console.error('Error getting owner properties:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting owner properties',
                error: error.message
            });
        }
    }
}

module.exports = new PropertyManagerController(); 