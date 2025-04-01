import { Router } from 'express';
import { 
  getSystemStatus, 
  toggleEmergencyMode, 
  toggleTradingPause, 
  togglePause 
} from '../controllers/systemController.js';

// ... existing code ... 