export const fetchWebhookData = async (action = 'Expense') => {
  const url = `https://n8n.srv1010832.hstgr.cloud/webhook/0c8d3fa1-25e7-417a-979b-3bbca5727b64?action=${action}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Webhook at ${url} returned status: ${response.status} - ${errorText}`);
      return { 
        error: true, 
        status: response.status, 
        message: errorText || 'Webhook returned an error state.' 
      };
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      return { textData: text };
    }
  } catch (error) {
    console.error('Error fetching webhook data:', error);
    return { error: true, message: error.message };
  }
};

