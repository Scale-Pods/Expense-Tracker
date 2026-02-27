import { subMonths, format } from 'date-fns';

export const servicesData = [
  { id: 1, name: 'AWS', vendor: 'Amazon Web Services', category: 'Cloud Infrastructure', billing: 'Monthly', cost: 3200, renewal: '2026-03-01', status: 'Active' },
  { id: 2, name: 'Google Workspace', vendor: 'Google', category: 'Office & Admin', billing: 'Monthly', cost: 1200, renewal: '2026-02-28', status: 'Active' },
  { id: 3, name: 'Salesforce', vendor: 'Salesforce', category: 'Marketing Tools', billing: 'Annual', cost: 30000, renewal: '2026-11-15', status: 'Active' },
  { id: 4, name: 'Slack', vendor: 'Salesforce', category: 'Communication', billing: 'Monthly', cost: 950, renewal: '2026-03-01', status: 'Active' },
  { id: 5, name: 'HubSpot', vendor: 'HubSpot', category: 'Marketing Tools', billing: 'Monthly', cost: 1800, renewal: '2026-03-05', status: 'Active' },
  { id: 6, name: 'Figma', vendor: 'Figma', category: 'Design', billing: 'Annual', cost: 5400, renewal: '2026-02-15', status: 'Active' },
  { id: 7, name: 'Zoom', vendor: 'Zoom Video Communications', category: 'Communication', billing: 'Monthly', cost: 200, renewal: '2026-02-20', status: 'Active' },
  { id: 8, name: 'Notion', vendor: 'Notion Labs', category: 'Office & Admin', billing: 'Monthly', cost: 150, renewal: '2026-02-25', status: 'Active' },
  { id: 9, name: 'Vercel', vendor: 'Vercel', category: 'Cloud Infrastructure', billing: 'Monthly', cost: 100, renewal: '2026-03-01', status: 'Active' },
  { id: 10, name: 'Linear', vendor: 'Linear', category: 'Development Tools', billing: 'Monthly', cost: 250, renewal: '2026-03-01', status: 'Active' },
  { id: 11, name: 'GitHub Copilot', vendor: 'Microsoft', category: 'Development Tools', billing: 'Monthly', cost: 400, renewal: '2026-03-01', status: 'Active' },
  { id: 12, name: 'Intercom', vendor: 'Intercom', category: 'Support', billing: 'Monthly', cost: 850, renewal: '2026-03-10', status: 'Cancelled' },
  { id: 13, name: 'Miro', vendor: 'Miro', category: 'Design', billing: 'Annual', cost: 1200, renewal: '2026-06-20', status: 'Active' },
  { id: 14, name: 'Datadog', vendor: 'Datadog', category: 'Cloud Infrastructure', billing: 'Monthly', cost: 1500, renewal: '2026-03-01', status: 'Active' },
  { id: 15, name: 'Quickbooks', vendor: 'Intuit', category: 'Finance', billing: 'Monthly', cost: 80, renewal: '2026-03-01', status: 'Active' },
];

export const KPIData = {
  totalMonthlySpend: 12450,
  totalAnnualCommitments: 145000,
  recurringSpendPercentage: 85,
  activeServicesCount: 24,
};

export const spendByCategory = [
  { name: 'Cloud Infrastructure', value: 4500, color: '#4F46E5' },
  { name: 'Marketing Tools', value: 3200, color: '#10B981' },
  { name: 'Development Tools', value: 2100, color: '#F59E0B' },
  { name: 'Communication', value: 1200, color: '#EF4444' },
  { name: 'Office & Admin', value: 1450, color: '#8B5CF6' },
];

export const monthlySpendTrend = Array.from({ length: 12 }).map((_, i) => {
  const date = subMonths(new Date(), 11 - i);
  return {
    month: format(date, 'MMM'),
    amount: Math.floor(Math.random() * (15000 - 10000) + 10000),
  };
});

export const topServices = [
  { name: 'AWS', cost: 3200 },
  { name: 'Google Workspace', cost: 1200 },
  { name: 'Salesforce', cost: 2500 },
  { name: 'Slack', cost: 950 },
  { name: 'HubSpot', cost: 1800 },
];

export const upcomingRenewals = [
  { id: 1, name: 'Figma', date: '2026-02-15', amount: 450, status: 'warning' },
  { id: 2, name: 'Zoom', date: '2026-02-20', amount: 200, status: 'ok' },
  { id: 3, name: 'Notion', date: '2026-02-25', amount: 150, status: 'ok' },
  { id: 4, name: 'Vercel', date: '2026-03-01', amount: 100, status: 'warning' },
];
