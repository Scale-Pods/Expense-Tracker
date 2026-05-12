import React from 'react';
import Card from '../common/Card';
import { ResponsiveContainer } from 'recharts';

const ChartCard = ({ title, children, height = 300, action }) => {
  return (
    <Card title={title} action={action} className="h-full">
      <div className="chart-container-inner" style={{ width: '100%', height: height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </Card>
  );
};

export default ChartCard;
