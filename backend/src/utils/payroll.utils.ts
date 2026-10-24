// HCM Lite: Payroll Calculation Engine
// Compliant with standard gross allowances breakdown and Pakistani income tax slabs

export interface SalaryBreakdown {
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  grossSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  absentDeduction: number;
  unpaidLeaveDeduction: number;
  taxWithholding: number;
  netSalary: number;
}

/**
 * Calculates Pakistani statutory annual income tax based on progressive tax slabs
 * Slabs:
 * 1. Up to PKR 600,000: 0%
 * 2. PKR 600,001 to 1,200,000: 5% of amount exceeding 600,000
 * 3. PKR 1,200,001 to 2,400,000: PKR 30,000 + 15% of amount exceeding 1,200,000
 * 4. PKR 2,400,001 to 3,600,000: PKR 210,000 + 25% of amount exceeding 2,400,000
 * 5. Exceeding PKR 3,600,000: PKR 510,000 + 35% of amount exceeding 3,600,000
 */
export function calculateAnnualTax(annualGross: number): number {
  if (annualGross <= 600000) {
    return 0;
  }
  if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  }
  if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  }
  if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  }
  return 510000 + (annualGross - 3600000) * 0.35;
}

export function computeEmployeeSalary(
  basicSalary: number,
  presentDays: number,
  absentDays: number,
  unpaidLeaveDays: number,
  standardWorkingDays: number = 26
): SalaryBreakdown {
  const round2 = (val: number) => Math.round(val * 100) / 100;

  const basic = Math.max(0, basicSalary);
  const hra = round2(basic * 0.4);
  const medicalAllowance = round2(basic * 0.1);
  const grossSalary = round2(basic * 1.5);

  const dailySalary = grossSalary / standardWorkingDays;

  const absentDeduction = round2(dailySalary * absentDays);
  const unpaidLeaveDeduction = round2(dailySalary * unpaidLeaveDays);

  const annualGross = grossSalary * 12;
  const annualTax = calculateAnnualTax(annualGross);
  const taxWithholding = round2(annualTax / 12);

  const totalDeductions = absentDeduction + unpaidLeaveDeduction + taxWithholding;
  const netSalary = Math.max(0, round2(grossSalary - totalDeductions));

  return {
    basicSalary: basic,
    hra,
    medicalAllowance,
    grossSalary,
    workingDays: standardWorkingDays,
    presentDays,
    absentDays,
    unpaidLeaveDays,
    absentDeduction,
    unpaidLeaveDeduction,
    taxWithholding,
    netSalary,
  };
}
