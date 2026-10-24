import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  AttendanceCheckInSchema,
  AttendanceCheckOutSchema,
  AttendanceCorrectionSchema,
} from '@hcm-lite/shared';

export const attendanceRoutes = Router();

// Employee & all active authenticated users
attendanceRoutes.get('/today', requireAuth, requireActiveAccount, attendanceController.getToday);
attendanceRoutes.get('/my-history', requireAuth, requireActiveAccount, attendanceController.getMyHistory);
attendanceRoutes.post(
  '/check-in',
  requireAuth,
  requireActiveAccount,
  validate(AttendanceCheckInSchema),
  attendanceController.checkIn
);
attendanceRoutes.post(
  '/check-out',
  requireAuth,
  requireActiveAccount,
  validate(AttendanceCheckOutSchema),
  attendanceController.checkOut
);

// Admin & HR management endpoints
attendanceRoutes.get(
  '/company',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  attendanceController.getCompanyAttendance
);
attendanceRoutes.get(
  '/summary',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  attendanceController.getSummary
);
attendanceRoutes.get(
  '/export/csv',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  attendanceController.exportCsv
);
attendanceRoutes.patch(
  '/:id/correct',
  requireAuth,
  requireActiveAccount,
  requireRole(['ADMIN', 'HR']),
  validate(AttendanceCorrectionSchema),
  attendanceController.correct
);
