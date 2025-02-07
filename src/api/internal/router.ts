import express from 'express';

import admins from './admins/router';
import changesHistory from './changes-history/router';

const router = express.Router();
export default router;

router.use('/admins', admins);
router.use('/changes-history', changesHistory);
