import { Router } from 'express';
import healthRoutes from './health.routes';
import setupRoutes from './setup.routes';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import departmentRoutes from './department.routes';
import designationRoutes from './designation.routes';
import holidayRoutes from './holiday.routes';
import employeeRoutes from './employee.routes';
import { attendanceRoutes } from './attendance.routes';
import { leaveRoutes } from './leave.routes';
import payrollRoutes from './payroll.routes';
import announcementRoutes from './announcement.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import aiRoutes from './ai.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/setup', setupRoutes);
router.use('/auth', authRoutes);
router.use('/organization', organizationRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/holidays', holidayRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/announcements', announcementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);

export default router;
