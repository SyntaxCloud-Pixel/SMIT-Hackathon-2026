import { storeService } from './store.service';
import { UserRole } from '@hcm-lite/shared';
import { logger } from '../utils/logger';

export interface GroundedContext {
  companyId: string;
  userId: string;
  userRole: UserRole;
  userEmail: string;
}

export const aiTools = {
  async getHeadcount(ctx: GroundedContext) {
    const employees = await storeService.listEmployees(ctx.companyId, { pageSize: 500, employmentStatus: 'ACTIVE' });
    const deptsResult = await storeService.listDepartments(ctx.companyId, { pageSize: 100 });
    const departments = deptsResult.items;

    const deptCounts: Record<string, number> = {};
    for (const emp of employees.items) {
      const d = emp.departmentName || 'Unassigned';
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    }

    return {
      totalActiveEmployees: employees.total,
      departmentBreakdown: deptCounts,
      departmentsList: departments.map((d: any) => d.name),
    };
  },

  async getAttendanceSummary(ctx: GroundedContext) {
    const company = await storeService.getCompanyById(ctx.companyId);
    const tz = company?.timezone || 'UTC';
    const today = new Date().toISOString().split('T')[0];
    const summary = await storeService.getCompanyAttendanceSummary(ctx.companyId, today);

    return {
      date: today,
      timezone: tz,
      totalEmployees: summary.totalEmployees,
      present: summary.presentCount,
      late: summary.lateCount,
      halfDay: summary.halfDayCount,
      absent: summary.absentCount,
      onLeave: summary.onLeaveCount,
      attendanceRate: summary.totalEmployees > 0 ? `${Math.round((summary.presentCount / summary.totalEmployees) * 100)}%` : '0%',
    };
  },

  async getMyLeaveBalance(ctx: GroundedContext) {
    const emp = await storeService.getEmployeeByUserId(ctx.companyId, ctx.userId);
    if (!emp) {
      return { error: 'No employee record linked to current account.' };
    }

    const balances = await storeService.getLeaveBalances(ctx.companyId, emp.id);
    return {
      employeeName: emp.fullName,
      balances: balances.map((b) => ({
        leaveType: b.leaveTypeName,
        annualQuota: b.annualQuota,
        used: b.usedDays,
        remaining: b.remainingDays,
        isPaid: b.isPaid,
      })),
    };
  },

  async getLeaveSummary(ctx: GroundedContext) {
    if (ctx.userRole === 'EMPLOYEE') {
      return await this.getMyLeaveBalance(ctx);
    }

    const pending = await storeService.getCompanyLeaveRequests(ctx.companyId, { status: 'PENDING', pageSize: 100 });
    return {
      pendingApprovalsCount: pending.total,
      pendingRequests: pending.items.map((r) => ({
        employee: r.employeeName,
        type: r.leaveTypeName,
        days: r.workingDays,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
      })),
    };
  },

  async getPayrollSummary(ctx: GroundedContext) {
    if (ctx.userRole === 'EMPLOYEE') {
      const emp = await storeService.getEmployeeByUserId(ctx.companyId, ctx.userId);
      if (!emp) return { error: 'No employee record linked.' };
      const payslips = await storeService.getEmployeePayslips(ctx.companyId, emp.id);
      if (payslips.length === 0) return { message: 'No finalized payslips on record yet.' };
      const latest = payslips[0];
      return {
        myLatestPayslip: {
          period: `${(latest as any).month}/${(latest as any).year}`,
          netSalary: `PKR ${latest.netSalary.toLocaleString()}`,
          grossSalary: `PKR ${latest.grossSalary.toLocaleString()}`,
          taxWithheld: `PKR ${latest.taxWithholding.toLocaleString()}`,
        },
      };
    }

    const runs = await storeService.getPayrollRuns(ctx.companyId);
    if (runs.length === 0) {
      return { message: 'No payroll cycles generated yet.' };
    }
    const latest = runs[0];
    return {
      latestRun: {
        period: `${latest.month}/${latest.year}`,
        status: latest.status,
        employeeCount: latest.employeeCount,
        totalGross: `PKR ${latest.totalGross.toLocaleString()}`,
        totalDeductions: `PKR ${latest.totalDeductions.toLocaleString()}`,
        totalNet: `PKR ${latest.totalNet.toLocaleString()}`,
      },
    };
  },

  async getCompanyPolicies(ctx: GroundedContext) {
    const company = await storeService.getCompanyById(ctx.companyId);
    const leaveTypes = await storeService.getLeaveTypes(ctx.companyId);
    return {
      companyName: company?.name,
      officeStartTime: company?.officeStartTime,
      gracePeriodMinutes: company?.gracePeriodMinutes,
      weekendDays: company?.weekendDays,
      leavePolicies: leaveTypes.map((lt) => ({
        policy: lt.name,
        annualQuota: `${lt.annualQuota} days`,
        type: lt.isPaid ? 'Paid' : 'Unpaid',
      })),
    };
  },
};

export const aiAssistantService = {
  async processQuery(ctx: GroundedContext, userMessage: string): Promise<string> {
    const q = userMessage.toLowerCase();

    // Gather grounded context
    const policies = await aiTools.getCompanyPolicies(ctx);

    let toolsData: any = {};
    if (q.includes('headcount') || q.includes('how many employees') || q.includes('staff count') || q.includes('workers')) {
      toolsData.headcount = await aiTools.getHeadcount(ctx);
    }
    if (q.includes('attendance') || q.includes('present') || q.includes('late') || q.includes('absent')) {
      toolsData.attendance = await aiTools.getAttendanceSummary(ctx);
    }
    if (q.includes('leave') || q.includes('vacation') || q.includes('balance') || q.includes('off')) {
      toolsData.leaves = ctx.userRole === 'EMPLOYEE' ? await aiTools.getMyLeaveBalance(ctx) : await aiTools.getLeaveSummary(ctx);
    }
    if (q.includes('payroll') || q.includes('salary') || q.includes('payslip') || q.includes('tax') || q.includes('deduction')) {
      toolsData.payroll = await aiTools.getPayrollSummary(ctx);
    }

    // If an external OpenAI key is configured, use fetch to call it
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `You are HCM Lite's enterprise AI HR assistant for ${policies.companyName}.
Company Grounded Facts:
${JSON.stringify({ policies, toolsData }, null, 2)}
User Role: ${ctx.userRole}
Question: ${userMessage}
Provide a concise, professional, and accurate response based strictly on the provided company facts.`;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          return data.choices[0].message.content;
        }
      } catch (err: any) {
        logger.warn('External OpenAI call failed, falling back to deterministic grounded engine', { error: err.message });
      }
    }

    // Deterministic High-Precision Enterprise Grounded Responder
    if (q.includes('leave') || q.includes('vacation') || q.includes('balance')) {
      if (ctx.userRole === 'EMPLOYEE') {
        const bal = await aiTools.getMyLeaveBalance(ctx);
        if ('error' in bal) return String(bal.error);
        const lines = bal.balances.map(
          (b) => `• **${b.leaveType}**: ${b.remaining} days remaining (${b.used} used of ${b.annualQuota} annual allowance)`
        );
        return `Here is your current leave entitlement status:\n\n${lines.join('\n')}\n\nYou can submit a new leave request anytime from the **My Leave** portal.`;
      } else {
        const lSummary = await aiTools.getLeaveSummary(ctx);
        if ('pendingApprovalsCount' in lSummary) {
          return `There are currently **${lSummary.pendingApprovalsCount} pending leave request(s)** awaiting review.\n\nYou can review, approve, or reject employee submissions in the **Leave Management** approval inbox.`;
        }
      }
    }

    if (q.includes('attendance') || q.includes('present') || q.includes('late') || q.includes('absent')) {
      const att = await aiTools.getAttendanceSummary(ctx);
      return `**Attendance Overview for Today (${att.date})**:\n\n• **Present Staff**: ${att.present}\n• **Late Arrivals**: ${att.late}\n• **Half Day**: ${att.halfDay}\n• **Absent**: ${att.absent}\n• **On Approved Leave**: ${att.onLeave}\n• **Overall Attendance Rate**: ${att.attendanceRate} (out of ${att.totalEmployees} total staff).`;
    }

    if (q.includes('headcount') || q.includes('how many employees') || q.includes('staff')) {
      const hc = await aiTools.getHeadcount(ctx);
      const deptLines = Object.entries(hc.departmentBreakdown).map(
        ([dept, count]) => `• **${dept}**: ${count} employee(s)`
      );
      return `**Workforce Headcount Summary**:\n\n• **Total Active Employees**: ${hc.totalActiveEmployees}\n\n**Department Distribution**:\n${deptLines.join('\n')}`;
    }

    if (q.includes('payroll') || q.includes('salary') || q.includes('payslip')) {
      const pSummary = await aiTools.getPayrollSummary(ctx);
      if ('myLatestPayslip' in pSummary && pSummary.myLatestPayslip) {
        const p = pSummary.myLatestPayslip;
        return `**Your Latest Payslip (${p.period})**:\n\n• **Net Disbursed Salary**: ${p.netSalary}\n• **Gross Earnings**: ${p.grossSalary}\n• **Tax Withholding**: ${p.taxWithheld}\n\nYou can view and download the full breakdown from **My Payslips**.`;
      }
      if ('latestRun' in pSummary && pSummary.latestRun) {
        const r = pSummary.latestRun;
        return `**Latest Payroll Run (${r.period})**:\n\n• **Status**: ${r.status}\n• **Employees Processed**: ${r.employeeCount}\n• **Total Net Payout**: ${r.totalNet}\n• **Total Gross**: ${r.totalGross}\n• **Total Deductions**: ${r.totalDeductions}`;
      }
      return 'No payroll cycles have been generated for this company yet.';
    }

    if (q.includes('policy') || q.includes('time') || q.includes('start') || q.includes('grace') || q.includes('weekend')) {
      const pol = await aiTools.getCompanyPolicies(ctx);
      const leaveLines = pol.leavePolicies.map((lp) => `• **${lp.policy}**: ${lp.annualQuota} (${lp.type})`);
      return `**${pol.companyName} Workplace Policies**:\n\n• **Standard Office Start Time**: ${pol.officeStartTime}\n• **Grace Period Allowance**: ${pol.gracePeriodMinutes} minutes\n• **Official Weekend Days**: ${pol.weekendDays?.join(', ')}\n\n**Leave Allowances**:\n${leaveLines.join('\n')}`;
    }

    return `Hello! I am your AI HCM Assistant for **${policies.companyName}**.\n\nYou can ask me questions about:\n• **Leave balances & quotas**: "What is my remaining leave balance?"\n• **Today's attendance**: "How many employees are present or late today?"\n• **Headcount & departments**: "What is our total staff headcount?"\n• **Payroll & salary slips**: "Show me the latest payroll cycle summary."\n• **Company policies**: "What is our official office start time and grace period?"`;
  },
};
