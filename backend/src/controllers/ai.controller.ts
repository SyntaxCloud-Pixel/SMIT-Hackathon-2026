import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { aiAssistantService } from '../services/ai.service';
import { AIChatRequestSchema } from '@hcm-lite/shared';
import { logger } from '../utils/logger';

export const aiController = {
  async chat(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const parsed = AIChatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.issues,
        });
      }

      const responseText = await aiAssistantService.processQuery(
        {
          companyId: user.companyId,
          userId: user.id,
          userRole: user.role,
          userEmail: user.email,
        },
        parsed.data.message
      );

      const suggestedPrompts =
        user.role === 'EMPLOYEE'
          ? [
              'What is my remaining leave balance?',
              'What are our official office hours and grace period?',
              'Show details of my latest payslip',
            ]
          : [
              'What is the workforce attendance rate today?',
              'What is our total headcount across departments?',
              'How many leave requests are awaiting approval?',
              'What is the total payout of our latest payroll run?',
            ];

      return res.json({
        response: responseText,
        suggestedPrompts,
      });
    } catch (err: any) {
      logger.error('Failed to process AI chat query', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
  },
};
