import React from 'react';
import Card from '../common/Card';
import { ResponsiveContainer } from 'recharts';

const ChartCard = ({ title, children, height = 300, action }) => {
  return (
    <Card title={title} action={action} className="h-full">
      <div style={{ width: '100%', height: height }}>
        <ResponsiveContainer>
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ChartCard;
