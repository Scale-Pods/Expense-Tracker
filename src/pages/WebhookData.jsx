import React from 'react';
import WebhookDataSection from '../components/WebhookDataSection';
import '../styles/global.css';

const WebhookData = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto stagger-load">
      <WebhookDataSection initialType="Expense" />
    </div>
  );
};

export default WebhookData;
