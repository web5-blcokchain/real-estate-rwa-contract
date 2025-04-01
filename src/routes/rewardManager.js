import { Router } from 'express';
import { 
  distributeRewards, 
  claimRewards, 
  getClaimableRewards, 
  getRewardHistory 
} from '../controllers/rewardManagerController.js';

// ... existing code ... 