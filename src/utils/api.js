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

    const textData = await response.text();
    if (!textData) return { message: 'Success' };

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(textData);
      } catch {
        return { textData };
      }
    } else {
      return { textData };
    }
  } catch (error) {
    console.error('Error fetching webhook data:', error);
    return { error: true, message: error.message };
  }
};
export const submitExpense = async (text, file = null, userEmail = '') => {
  const contentAction = file ? 'image' : 'text';
  const userName = userEmail.toLowerCase().includes('adnan') ? 'adnan' : 
                   userEmail.toLowerCase().includes('raunak') ? 'raunak' : 
                   'unknown';
  
  const url = `https://n8n.srv1010832.hstgr.cloud/webhook/8afa11c4-df1a-4f44-9990-6e6229f15cd2?action=${contentAction}&user=${userName}`;
  
  try {
    const formData = new FormData();
    formData.append('action', contentAction);
    formData.append('text', text);
    formData.append('timestamp', new Date().toISOString());
    formData.append('user', userEmail);
    
    if (file) {
       formData.append('image', file);
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: true, message: errorText || 'Failed to submit expense.' };
    }

    const textResult = await response.text();
    if (!textResult) return { message: 'Expense tracked successfully!' };

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(textResult);
      } catch {
        return { message: textResult };
      }
    } else {
      try {
         const parsed = JSON.parse(textResult);
         if (parsed.message) return { message: parsed.message, ...parsed };
         return parsed;
      } catch {
         return { message: textResult };
      }
    }
  } catch (error) {
    console.error('Error submitting expense:', error);
    return { error: true, message: error.message };
  }
};
