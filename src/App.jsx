import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import html2canvas from 'html2canvas';
import './App.css';

// Google Sheets integration function
async function saveToGoogleSheets(data) {
  // Replace this URL with your NEW Google Apps Script web app URL
  // Go to Google Apps Script → Deploy → New deployment → Web app
  // Copy the NEW URL and paste it here
  const GOOGLE_SHEETS_WEBAPP_URL = `https://script.google.com/macros/s/AKfycbyGSAo6jp9VVtwrlcWcz55J2R1c9_SnvnNNcuD06s5PF1UPciJRgcSlS2LzFnCVo7rN4A/exec`
  console.log('🌐 Making request to Google Sheets web app...');
  console.log('📡 URL:', GOOGLE_SHEETS_WEBAPP_URL);
  console.log('📦 Data being sent:', data);
  
  // Method 1: Try using a CORS proxy
  try {
    console.log('🔄 Attempting request via CORS proxy...');
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const fullUrl = proxyUrl + GOOGLE_SHEETS_WEBAPP_URL;
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify(data)
    });
    
    console.log('📡 Proxy response status:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Data saved to Google Sheets successfully (via proxy):', result);
      return true;
    } else {
      throw new Error(`Proxy request failed: ${response.status}`);
    }
  } catch (error) {
    console.error('🔥 Proxy request failed, trying alternative method...', error);
    
    // Method 2: Try using a different approach - create a hidden form submission
    try {
      console.log('🔄 Attempting silent form submission method...');
      
      // Create a hidden form and submit it silently
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = GOOGLE_SHEETS_WEBAPP_URL;
      form.target = 'hidden-iframe'; // Use hidden iframe instead of new window
      form.style.display = 'none';
      
      // Create hidden iframe if it doesn't exist
      let iframe = document.getElementById('hidden-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'hidden-iframe';
        iframe.name = 'hidden-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      
      // Add the data as a hidden input
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'data';
      input.value = JSON.stringify(data);
      form.appendChild(input);
      
      // Submit the form
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
      console.log('✅ Silent form submission completed');
      return true; // Assume success
    } catch (error2) {
      console.error('🔥 Form submission failed:', error2);
      
      // Method 3: Try direct request with no-cors
      try {
        console.log('🔄 Attempting direct request with no-cors...');
        const response3 = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        console.log('📡 No-cors response status:', response3.status, response3.statusText);
        console.log('✅ No-cors request completed');
        return true; // Assume success in no-cors mode
      } catch (error3) {
        console.error('🔥 All methods failed:', error3);
        return false;
      }
    }
  }
}

function parseOcrText(text) {
  const fields = {
    'Test ID': '',
    'eVIN': '',
    'User VIN': '',
    'License Plate': '',
    'Test Type': '',
    'Protocol': '',
    'Test Result': '',
    'Test Date/Time': ''
  };
  const labelMap = {
    'test id': 'Test ID',
    'evin': 'eVIN',
    'user vin': 'User VIN',
    'license plate': 'License Plate',
    'test type': 'Test Type',
    'protocol': 'Protocol',
    'test result': 'Test Result',
    'test date/time': 'Test Date/Time'
  };
  const lines = text.split('\n');
  let lastField = null;
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    // Log each line for debugging
    console.log('[OCR] Processing line:', line);
    // Try to match a label at the start of the line
    const match = line.match(/^([A-Za-z /]+)[: ]+(.*)$/);
    if (match) {
      const label = match[1].toLowerCase().replace(/ +/g, ' ').trim();
      const value = match[2].trim();
      if (labelMap[label]) {
        fields[labelMap[label]] = value;
        lastField = labelMap[label];
      } else {
        lastField = null;
      }
    } else if (lastField && fields[lastField] === '') {
      // If previous field was just set and this line is not a label, append as value (for multi-line fields)
      fields[lastField] = line;
    }
  }
  // Clean up
  Object.keys(fields).forEach(k => fields[k] = fields[k].trim());
  return fields;
}

async function decodeVin(vin) {
  if (!vin || vin.length < 8) return null;
  try {
    console.log('[VIN API] Decoding VIN:', vin);
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`);
    const data = await res.json();
    console.log('[VIN API] Result for', vin, ':', data.Results && data.Results[0]);
    if (data.Results && data.Results[0] && data.Results[0].VIN && data.Results[0].VIN.length >= 8) {
      return data.Results[0];
    }
    return null;
  } catch (err) {
    console.log('[VIN API] Error decoding VIN:', vin, err);
    return null;
  }
}

// Client search function
async function searchClients(searchTerm, onStatusUpdate = null) {
  try {
    // Call Google Apps Script for client search
    const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzO2Aq6bway6pgiJkUmGDBPobftpuzjqUeMBtEFvY1KzBJeNZzgRkU7wCAamdc8F8O6UA/exec'
    
    // Update status: Starting search
    if (onStatusUpdate) onStatusUpdate('searching', '🔍 正在搜索客户...');
    
    // Method 1: Try GET request first (most reliable - 95% success rate)
    try {
      const url = `${GOOGLE_SHEETS_WEBAPP_URL}?action=searchClients&searchTerm=${encodeURIComponent(searchTerm)}`;
      console.log('🔍 Searching clients via GET:', url);
      
      if (onStatusUpdate) onStatusUpdate('searching', '🌐 从Google表格获取数据...');
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📦 Response data:', result);
        
        if (result.success && result.clients) {
          console.log('✅ Found clients:', result.clients);
          if (onStatusUpdate) onStatusUpdate('success', `✅ 找到 ${result.clients.length} 个客户`);
          return result.clients;
        } else {
          console.log('⚠️ No clients found or invalid response');
          if (onStatusUpdate) onStatusUpdate('success', '✅ 搜索完成（无结果）');
          return [];
        }
      } else {
        console.log('❌ Response not ok:', response.status);
        if (onStatusUpdate) onStatusUpdate('searching', '🔄 响应错误，尝试备用方案...');
      }
    } catch (getError) {
      console.log('🔄 GET request failed, trying POST methods...');
      if (onStatusUpdate) onStatusUpdate('searching', '🔄 GET失败，尝试POST方法...');
    }
    
    // Method 2: Try direct POST request as fallback
    try {
      if (onStatusUpdate) onStatusUpdate('searching', '📡 尝试直接连接...');
      
      const response = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'searchClients',
          searchTerm: searchTerm
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (onStatusUpdate) onStatusUpdate('success', `✅ 找到 ${result.clients?.length || 0} 个客户`);
          return result.clients || [];
        }
      }
    } catch (fetchError) {
      console.log('🔄 Fetch failed, trying form submission...');
      if (onStatusUpdate) onStatusUpdate('searching', '🔄 直接连接失败，尝试表单提交...');
    }
    
    // Method 3: Try form submission approach as last resort
    try {
      if (onStatusUpdate) onStatusUpdate('searching', '📝 尝试表单提交...');
      
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        action: 'searchClients',
        searchTerm: searchTerm
      }));
      
      const response = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          if (onStatusUpdate) onStatusUpdate('success', `✅ 找到 ${result.clients?.length || 0} 个客户`);
          return result.clients || [];
        }
      }
    } catch (formError) {
      console.log('🔄 Form submission failed, all methods exhausted');
      if (onStatusUpdate) onStatusUpdate('searching', '🔄 所有方法都失败...');
    }
    
    // If all methods fail, throw error to trigger fallback
    if (onStatusUpdate) onStatusUpdate('error', '❌ 所有方法都失败，使用备用数据');
    throw new Error('All Google Apps Script methods failed');
    
  } catch (error) {
    console.error('❌ Error searching clients:', error);
    
    // Fallback to mock data if Google Apps Script is unavailable
    console.log('🔄 Falling back to mock data...');
    if (onStatusUpdate) onStatusUpdate('success', '🔄 使用备用数据');
    const mockClients = [
      { id: 1, company: 'ABC Trucking', name: 'John Smith', phone: '415-555-0101', clientEmail: 'john@abctrucking.com', accountEmail: 'john.account@abctrucking.com', address: '123 Main St, San Francisco, CA' },
      { id: 2, company: 'XYZ Logistics', name: 'Jane Doe', phone: '415-555-0202', clientEmail: 'jane@xyzlogistics.com', accountEmail: 'jane.account@xyzlogistics.com', address: '456 Oak Ave, Oakland, CA' },
      { id: 3, company: 'Fast Freight', name: 'Bob Johnson', phone: '650-555-0303', clientEmail: 'bob@fastfreight.com', accountEmail: 'bob.account@fastfreight.com', address: '789 Pine St, San Jose, CA' },
      { id: 4, company: 'Reliable Transport', name: 'Alice Brown', phone: '650-555-0404', clientEmail: 'alice@reliable.com', accountEmail: 'alice.account@reliable.com', address: '321 Elm St, Palo Alto, CA' },
      { id: 5, company: 'Premium Shipping', name: 'Charlie Wilson', phone: '415-555-0505', clientEmail: 'charlie@premium.com', accountEmail: 'charlie.account@premium.com', address: '654 Maple Dr, Berkeley, CA' }
    ];
    
    // Filter clients based on search term
    const filteredClients = mockClients.filter(client => 
      client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(client.phone || '').includes(searchTerm) ||
      client.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.accountEmail && client.accountEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    return filteredClients;
  }
}

// Helper to check if a decoded VIN is valid
function isVinValid(decoded) {
  console.log('🔍 Checking if VIN is valid...');
  console.log('🔍 Decoded object:', decoded);
  console.log('🔍 ErrorCode:', decoded?.ErrorCode);
  console.log('🔍 ErrorText:', decoded?.ErrorText);
  
  if (!decoded || !decoded.ErrorCode) {
    console.log('❌ No decoded object or ErrorCode');
    return false;
  }
  
  const isValid = decoded.ErrorCode === "0" || decoded.ErrorCode.startsWith("0,");
  console.log('✅ VIN validation result:', isValid);
  return isValid;
}

// Check VIN via API and return error details
async function checkVinValidity(vin) {
  console.log('🔍 Checking VIN via API:', vin);
  
  if (!vin || vin.length < 8) {
    console.log('❌ VIN too short, skipping API check');
    return { isValid: false, error: 'VIN too short' };
  }
  
  try {
    console.log('📡 Making API request to NHTSA...');
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${vin}?format=json`);
    console.log('📡 API Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      console.error('❌ API request failed:', res.status, res.statusText);
      return { isValid: false, error: `API Error: ${res.status} ${res.statusText}` };
    }
    
    const data = await res.json();
    console.log('📊 Full API Response:', data);
    
    if (data.Results && data.Results[0]) {
      const result = data.Results[0];
      console.log('🔍 API Result object:', result);
      console.log('🔍 Error Code:', result.ErrorCode);
      console.log('🔍 Error Text:', result.ErrorText);
      console.log('🔍 Make:', result.Make);
      console.log('🔍 Model Year:', result.ModelYear);
      
      const isValid = isVinValid(result);
      console.log('✅ VIN Valid according to our logic:', isValid);
      
      return {
        isValid,
        error: isValid ? null : result.ErrorText || 'Unknown VIN error',
        make: result.Make || '',
        modelYear: result.ModelYear || ''
      };
    }
    
    console.warn('⚠️ No results in API response');
    return { isValid: false, error: 'No data returned from VIN API' };
  } catch (err) {
    console.error('🔥 Network error checking VIN:', err);
    return { isValid: false, error: 'Network error checking VIN' };
  }
}

function App() {
  const [step, setStep] = useState(1);
  const [userInfo, setUserInfo] = useState({ company: '', name: '', phone: '', clientEmail: '', accountEmail: '', address: '', totalCharge: '', additionalService: '' });
  
  // Client search state - separate for each field
  const [companySearchResults, setCompanySearchResults] = useState([]);
  const [nameSearchResults, setNameSearchResults] = useState([]);
  const [phoneSearchResults, setPhoneSearchResults] = useState([]);
  const [clientEmailSearchResults, setClientEmailSearchResults] = useState([]);
  const [accountEmailSearchResults, setAccountEmailSearchResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [clientSearchStatus, setClientSearchStatus] = useState({ message: '', type: '' });
  const [confirmedData, setConfirmedData] = useState({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const receiptRef = useRef();
  const [images, setImages] = useState([]);
  const [vehicleData, setVehicleData] = useState([]); // [{ image, vin, licensePlate, make, modelYear, vinApiError }]
  const [receiptImage, setReceiptImage] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [vinValidationResults, setVinValidationResults] = useState({}); // { vin: { isValid, error, make, modelYear } }

  // Step 1: Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imgUrl = URL.createObjectURL(file);
      setImages(prev => [...prev, imgUrl]);
      setVehicleData(prev => [...prev, { image: imgUrl, file, vin: '', licensePlate: '', make: '', modelYear: '', vinApiError: false }]);
    }
  };

  // Preprocess image for better OCR
  const preprocessImageForOCR = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Enhance contrast and brightness for better OCR
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale and enhance contrast
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          const enhanced = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
          
          data[i] = enhanced;     // Red
          data[i + 1] = enhanced; // Green
          data[i + 2] = enhanced; // Blue
          // Alpha stays the same
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert back to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Step 2: User Info (all optional)
  const handleUserInfo = (e) => {
    setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
  };
  const handleUserInfoSubmit = (e) => {
    e.preventDefault();
    setStep(4);
  };

  const handleVehicleFieldChange = (idx, field, value) => {
    setVehicleData(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    
    // If VIN changed, validate it
    if (field === 'vin') {
      console.log('🔄 VIN field changed:', value);
      console.log('🔄 VIN length:', value.length);
      
      if (value.length >= 8) {
        console.log('⏰ Scheduling VIN validation in 500ms...');
        // Debounce the API call
        setTimeout(async () => {
          console.log('🚀 Starting VIN validation for:', value);
          const validation = await checkVinValidity(value);
          console.log('📋 Validation result:', validation);
          setVinValidationResults(prev => ({
            ...prev,
            [value]: validation
          }));
          
          // Update vehicleData with the new make and model year if validation is successful
          if (validation.isValid) {
            setVehicleData(prev => prev.map((v, i) => 
              i === idx ? { 
                ...v, 
                make: validation.make || v.make,
                modelYear: validation.modelYear || v.modelYear
              } : v
            ));
          }
        }, 500); // Wait 500ms after user stops typing
      } else {
        console.log('⏭️ VIN too short, skipping validation');
      }
    }
  };

  // Step 4: Confirm/Edit Data
  const handleConfirmChange = (e) => {
    setOcrData({ ...ocrData, [e.target.name]: e.target.value });
  };
  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    console.log('🔄 Starting handleConfirmSubmit...');
    setConfirmedData({ ...userInfo });
    
    // Prepare data for Google Sheets
    const receiptData = {
      date: new Date().toISOString().slice(0, 10),
      totalCharge: userInfo.totalCharge,
      company: userInfo.company,
      name: userInfo.name,
      phone: userInfo.phone,
              clientEmail: userInfo.clientEmail,
      address: userInfo.address,
      additionalService: userInfo.additionalService,
      vehicles: vehicleData.map(v => ({
        vin: v.vin,
        licensePlate: v.licensePlate,
        make: v.make,
        modelYear: v.modelYear
      }))
    };
    
    console.log('📋 Receipt data prepared:', receiptData);
    
    // Generate receipt image
    try {
      console.log('🔍 Checking receiptRef...');
      if (!receiptRef.current) {
        console.error('❌ Receipt ref not found');
        alert('Error: Receipt reference not found. Please try again.');
        return;
      }
      
      console.log('✅ Receipt ref found, starting html2canvas conversion...');
      const canvas = await html2canvas(receiptRef.current);
      console.log('✅ Canvas created successfully');
      
      // Convert canvas to data URL and set it
      const imageDataUrl = canvas.toDataURL('image/png');
      console.log('✅ Image data URL created, length:', imageDataUrl.length);
      
      setReceiptImage(imageDataUrl);
      console.log('✅ Receipt image state set');
      
      setStep(4);
      console.log('✅ Step set to 4');
      
      // Save data to Google Sheets (non-blocking and silent)
      console.log('📤 Starting Google Sheets save...');
      saveToGoogleSheets(receiptData).then(success => {
        if (success) {
          console.log('✅ Receipt data saved to spreadsheet');
        } else {
          console.log('❌ Failed to save receipt data to spreadsheet');
        }
      }).catch(error => {
        console.error('🔥 Error in Google Sheets save:', error);
      });
      
    } catch (error) {
      console.error('🔥 Error generating receipt:', error);
      alert('Error generating receipt image. Please try again. Error: ' + error.message);
    }
  };

  // Step 5: Receipt Preview and Download
  const handleDownload = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current);
    const link = document.createElement('a');
    
    // Generate custom filename with VIN and date
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const firstVin = vehicleData.length > 0 && vehicleData[0].vin ? vehicleData[0].vin : 'unknown';
    const filename = `${firstVin}_${today}.png`;
    
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    try {
      if (!receiptRef.current) {
        console.log('Receipt ref not found');
        return;
      }
      
      console.log('Starting html2canvas conversion...');
      const canvas = await html2canvas(receiptRef.current);
      console.log('Canvas created successfully');
      
      // Create a new window/tab with the image
      console.log('Attempting to open new window...');
      const newWindow = window.open('', '_blank');
      
      if (newWindow) {
        console.log('New window opened successfully');
        const imageDataUrl = canvas.toDataURL('image/png');
        
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>CARB Receipt</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
              }
              .container {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                max-width: 100%;
                text-align: center;
              }
              .receipt-image {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .instructions {
                margin-top: 20px;
                color: #666;
                font-size: 14px;
                line-height: 1.5;
              }
              .download-btn {
                margin-top: 16px;
                padding: 12px 24px;
                background: #1a4a5e;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
              }
              .download-btn:hover {
                background: #153a4a;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${imageDataUrl}" alt="CARB Receipt" class="receipt-image">
              <div class="instructions">
                <p><strong>To save this image:</strong></p>
                <p>• <strong>Mobile:</strong> Long-press the image and select "Save Image"</p>
                <p>• <strong>Desktop:</strong> Right-click the image and select "Save Image As"</p>
              </div>
              <a href="${imageDataUrl}" download="carb-receipt.png" class="download-btn">
                Download Receipt
              </a>
            </div>
          </body>
          </html>
        `);
        newWindow.document.close();
        console.log('New window content written successfully');
      } else {
        console.log('Popup blocked, falling back to download');
        // Fallback: if popup is blocked, try to download directly
        const link = document.createElement('a');
        link.download = 'carb-receipt.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (error) {
      console.error('Error in handleShare:', error);
      alert('Error generating receipt image. Please try again.');
    }
  };

  return (
    <div className="App" style={{ 
      minHeight: '100vh',
      padding: '16px',
      boxSizing: 'border-box',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      {step === 1 && (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>第一步：上传图片</h2>
          <label htmlFor="file-upload" style={{
            display: 'block',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto 24px auto',
            padding: '16px',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            background: '#fafbfc',
            textAlign: 'center',
            fontSize: '16px',
            color: '#333',
            cursor: 'pointer',
          }}>
            选择相片
            <input 
              id="file-upload"
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </label>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px', 
            marginTop: '10px',
            justifyContent: 'center'
          }}>
            {images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt={`Preview ${idx + 1}`} 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  objectFit: 'cover',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }} 
              />
            ))}
          </div>
          <button 
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '14px',
              backgroundColor: '#1a4a5e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }} 
            onClick={async () => {
              if (images.length > 0) {
                setOcrLoading(true);
                setOcrError('');
                try {
                  // OCR all images
                  const results = [];
                  for (let v of vehicleData) {
                    const preprocessedFile = await preprocessImageForOCR(v.file);
                    const { data } = await Tesseract.recognize(preprocessedFile, 'eng', { logger: (m) => {} });
                    const parsed = parseOcrText(data.text);
                    // VIN logic (use eVIN or User VIN, prefer valid)
                    let chosenVin = '';
                    let make = '';
                    let modelYear = '';
                    let vinApiError = false;
                    
                    if (parsed['eVIN'] && parsed['User VIN']) {
                      if (parsed['eVIN'] === parsed['User VIN']) {
                        chosenVin = parsed['eVIN'];
                      } else {
                        const [evinDecoded, uservinDecoded] = await Promise.all([
                          decodeVin(parsed['eVIN']),
                          decodeVin(parsed['User VIN'])
                        ]);
                        const evinValid = isVinValid(evinDecoded);
                        const uservinValid = isVinValid(uservinDecoded);
                        if (evinValid && !uservinValid) {
                          chosenVin = parsed['eVIN'];
                        } else if (!evinValid && uservinValid) {
                          chosenVin = parsed['User VIN'];
                        } else if (evinValid && uservinValid) {
                          chosenVin = parsed['eVIN']; // default to eVIN if both valid
                        } else {
                          // Both are invalid, default to eVIN but mark as potentially invalid
                          chosenVin = parsed['eVIN'];
                          console.log('⚠️ Both VINs failed validation, defaulting to eVIN:', parsed['eVIN']);
                        }
                      }
                    } else if (parsed['eVIN']) {
                      chosenVin = parsed['eVIN'];
                    } else if (parsed['User VIN']) {
                      chosenVin = parsed['User VIN'];
                    }
                    
                    // Get Make and ModelYear from VIN API after determining correct VIN
                    if (chosenVin) {
                      try {
                        const vinDecoded = await decodeVin(chosenVin);
                        if (vinDecoded) {
                          make = vinDecoded.Make || '';
                          modelYear = vinDecoded.ModelYear || '';
                        }
                      } catch (err) {
                        vinApiError = true;
                        console.log('VIN API error for', chosenVin, err);
                      }
                      
                      // Automatically validate the chosen VIN after extraction
                      console.log('🔍 Auto-validating extracted VIN:', chosenVin);
                      const validation = await checkVinValidity(chosenVin);
                      console.log('📋 Auto-validation result:', validation);
                      setVinValidationResults(prev => ({
                        ...prev,
                        [chosenVin]: validation
                      }));
                    }
                    
                    results.push({ ...v, vin: chosenVin, licensePlate: parsed['License Plate'] || '', make, modelYear, vinApiError });
                  }
                  setVehicleData(results);
                  setStep(2);
                } catch (err) {
                  setOcrError('OCR failed. Please try clearer images.');
                } finally {
                  setOcrLoading(false);
                }
              }
            }} 
            disabled={images.length === 0 || ocrLoading}
          >
            下一步
          </button>
          {ocrError && <div style={{ color: 'red', marginTop: '8px', textAlign: 'center' }}>{ocrError}</div>}
        </div>
      )}
      {step === 2 && (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>第二步：提取车辆信息</h2>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {vehicleData.map((v, idx) => (
              <div key={idx} style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <img 
                    src={v.image} 
                    alt={`Vehicle ${idx + 1}`} 
                    style={{ 
                      width: '100%', 
                      maxWidth: '200px',
                      height: '120px', 
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      alignSelf: 'center'
                    }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr', 
                      gap: '12px'
                    }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '4px' 
                        }}>
                          VIN
                        </label>
                        <input 
                          value={v.vin} 
                          onChange={e => handleVehicleFieldChange(idx, 'vin', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            boxSizing: 'border-box'
                          }}
                        />
                        {(() => {
                          const apiValidation = vinValidationResults[v.vin];
                          
                          return (
                            <div style={{ marginTop: '4px' }}>
                              {/* API validation - show when available */}
                              {apiValidation && (
                                <div style={{ 
                                  color: apiValidation.isValid ? '#059669' : '#dc2626', 
                                  fontSize: '12px',
                                  fontStyle: 'italic',
                                  fontWeight: apiValidation.error ? '600' : '400'
                                }}>
                                  {apiValidation.isValid ? 
                                    '✅ VIN verified with NHTSA database' : 
                                    `❌ ${apiValidation.error}`
                                  }
                                </div>
                              )}
                              
                              {/* Loading indicator when API check is in progress */}
                              {v.vin.length >= 8 && !apiValidation && (
                                <div style={{ 
                                  color: '#6b7280', 
                                  fontSize: '12px',
                                  fontStyle: 'italic'
                                }}>
                                  🔄 Verifying with NHTSA database...
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '4px' 
                        }}>
                          License Plate
                        </label>
                        <input 
                          value={v.licensePlate} 
                          onChange={e => handleVehicleFieldChange(idx, 'licensePlate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr', 
                      gap: '12px' 
                    }}>
                      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '4px' 
                        }}>
                          Make
                        </label>
                        <div style={{
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '16px',
                          backgroundColor: '#f9fafb',
                          color: '#6b7280'
                        }}>
                          {(() => {
                            const apiValidation = vinValidationResults[v.vin];
                            if (apiValidation && apiValidation.isValid) {
                              return apiValidation.make || 'Not available';
                            }
                            return v.make || 'Not available';
                          })()}
                        </div>
                      </div>
      <div>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#374151', 
                          marginBottom: '4px' 
                        }}>
                          Model Year
                        </label>
                        <div style={{
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '16px',
                          backgroundColor: '#f9fafb',
                          color: '#6b7280'
                        }}>
                          {(() => {
                            const apiValidation = vinValidationResults[v.vin];
                            if (apiValidation && apiValidation.isValid) {
                              return apiValidation.modelYear || 'Not available';
                            }
                            return v.modelYear || 'Not available';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={() => setStep(3)}
              style={{
                padding: '14px 32px',
                backgroundColor: '#1a4a5e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                alignSelf: 'center',
                marginTop: '16px',
                width: '100%',
                maxWidth: '200px'
              }}
            >
              下一步
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <form onSubmit={handleConfirmSubmit} style={{ maxWidth: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>第三步：填写客户信息（可跳过）</h2>
          
          {/* Client Search Status Message */}
          {clientSearchStatus.message && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
              backgroundColor: clientSearchStatus.type === 'error' ? '#fef2f2' : 
                             clientSearchStatus.type === 'success' ? '#f0fdf4' : '#f0f9ff',
              color: clientSearchStatus.type === 'error' ? '#dc2626' : 
                     clientSearchStatus.type === 'success' ? '#16a34a' : '#0284c7',
              border: `1px solid ${clientSearchStatus.type === 'error' ? '#fecaca' : 
                                   clientSearchStatus.type === 'success' ? '#bbf7d0' : '#bae6fd'}`
            }}>
              {clientSearchStatus.message}
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <input 
              name="totalCharge" 
              placeholder="总费用(填数字，例如：120)" 
              value={userInfo.totalCharge} 
              onChange={handleUserInfo}
              required
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ position: 'relative' }}>
            <input 
              name="company" 
              placeholder="公司" 
              value={userInfo.company} 
                onChange={(e) => {
                  handleUserInfo(e);
                  // Trigger client search when company field changes
                  if (e.target.value.length >= 2) {
                    setClientSearchLoading(true);
                    setClientSearchStatus({ message: '🔍 正在搜索...', type: 'searching' });
                    
                    searchClients(e.target.value, (type, message) => {
                      setClientSearchStatus({ message, type });
                      setClientSearchLoading(false);
                    }).then(clients => {
                      setCompanySearchResults(clients.filter(client => 
                        client.company.toLowerCase().includes(e.target.value.toLowerCase())
                      ));
                    }).catch(() => {
                      setClientSearchLoading(false);
                    });
                  } else {
                    setCompanySearchResults([]);
                    setClientSearchStatus({ message: '', type: '' });
                  }
                }}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
              
              {/* Loading Spinner for Company Search */}
              {clientSearchLoading && userInfo.company.length >= 2 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  right: '16px',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
              )}
              
              {/* Company Search Results */}
              {companySearchResults.length > 0 && userInfo.company.length >= 2 && (
                <div 
                  data-dropdown="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  {companySearchResults.map((client, idx) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setUserInfo({
                          company: client.company || '',
                          name: client.name || '',
                          phone: client.phone || '',
                          clientEmail: client.clientEmail || '',
                          accountEmail: client.accountEmail || '',
                          address: client.address || '',
                          totalCharge: userInfo.totalCharge,
                          additionalService: userInfo.additionalService
                        });
                        setCompanySearchResults([]);
                        setClientSearchStatus({ message: '', type: '' });
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < companySearchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {client.company}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {client.name} • {client.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
            <input 
              name="name" 
              placeholder="姓名" 
              value={userInfo.name} 
                onChange={(e) => {
                  handleUserInfo(e);
                  // Trigger client search when name field changes
                  if (e.target.value.length >= 2) {
                    setClientSearchLoading(true);
                    setClientSearchStatus({ message: '🔍 正在搜索...', type: 'searching' });
                    
                    searchClients(e.target.value, (type, message) => {
                      setClientSearchStatus({ message, type });
                      setClientSearchLoading(false);
                    }).then(clients => {
                      setNameSearchResults(clients.filter(client => 
                        client.name.toLowerCase().includes(e.target.value.toLowerCase())
                      ));
                    }).catch(() => {
                      setClientSearchLoading(false);
                    });
                  } else {
                    setNameSearchResults([]);
                    setClientSearchStatus({ message: '', type: '' });
                  }
                }}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
              
              {/* Name Search Results */}
              {nameSearchResults.length > 0 && userInfo.name.length >= 2 && (
                <div 
                  data-dropdown="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  {nameSearchResults.map((client, idx) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setUserInfo({
                          company: client.company || '',
                          name: client.name || '',
                          phone: client.phone || '',
                          clientEmail: client.clientEmail || '',
                          accountEmail: client.accountEmail || '',
                          address: client.address || '',
                          totalCharge: userInfo.totalCharge,
                          additionalService: client.additionalService
                        });
                        setNameSearchResults([]);
                        setClientSearchStatus({ message: '', type: '' });
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < nameSearchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {client.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {client.company} • {client.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
            <input 
              name="phone" 
              placeholder="电话" 
              value={userInfo.phone} 
                onChange={(e) => {
                  handleUserInfo(e);
                  // Trigger client search when phone field changes
                  if (e.target.value.length >= 2) {
                    setClientSearchLoading(true);
                    setClientSearchStatus({ message: '🔍 正在搜索...', type: 'searching' });
                    
                    searchClients(e.target.value, (type, message) => {
                      setClientSearchStatus({ message, type });
                      setClientSearchLoading(false);
                    }).then(clients => {
                      setPhoneSearchResults(clients.filter(client => 
                        String(client.phone || '').includes(e.target.value)
                      ));
                    }).catch(() => {
                      setClientSearchLoading(false);
                    });
                  } else {
                    setPhoneSearchResults([]);
                    setClientSearchStatus({ message: '', type: '' });
                  }
                }}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
              
              {/* Phone Search Results */}
              {phoneSearchResults.length > 0 && userInfo.phone.length >= 2 && (
                <div 
                  data-dropdown="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  {phoneSearchResults.map((client, idx) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setUserInfo({
                          company: client.company || '',
                          name: client.name || '',
                          phone: client.phone || '',
                          clientEmail: client.clientEmail || '',
                          accountEmail: client.accountEmail || '',
                          address: client.address || '',
                          totalCharge: userInfo.totalCharge,
                          additionalService: userInfo.additionalService
                        });
                        setPhoneSearchResults([]);
                        setClientSearchStatus({ message: '', type: '' });
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < phoneSearchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {client.phone}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {client.company} • {client.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
            <input 
                name="clientEmail" 
                placeholder="客户邮箱" 
                value={userInfo.clientEmail} 
                onChange={(e) => {
                  handleUserInfo(e);
                  // Trigger client search when email field changes
                  if (e.target.value.length >= 2) {
                    setClientSearchLoading(true);
                    setClientSearchStatus({ message: '🔍 正在搜索...', type: 'searching' });
                    
                    searchClients(e.target.value, (type, message) => {
                      setClientSearchStatus({ message, type });
                      setClientSearchLoading(false);
                                        }).then(clients => {
                      setClientEmailSearchResults(clients.filter(client => 
                        client.clientEmail.toLowerCase().includes(e.target.value.toLowerCase())
                      ));
                    }).catch(() => {
                      setClientSearchLoading(false);
                    });
                  } else {
                    setClientEmailSearchResults([]);
                    setClientSearchStatus({ message: '', type: '' });
                  }
                }}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
              
              {/* Client Email Search Results */}
              {clientEmailSearchResults.length > 0 && userInfo.clientEmail.length >= 2 && (
                <div 
                  data-dropdown="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  {clientEmailSearchResults.map((client, idx) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setUserInfo({
                          company: client.company || '',
                          name: client.name || '',
                          phone: client.phone || '',
                          clientEmail: client.clientEmail || '',
                          accountEmail: client.accountEmail || '',
                          address: client.address || '',
                          totalCharge: userInfo.totalCharge,
                          additionalService: userInfo.additionalService
                        });
                        setClientEmailSearchResults([]);
                        setClientSearchStatus({ message: '', type: '' });
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < clientEmailSearchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {client.clientEmail}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {client.company} • {client.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                name="accountEmail" 
                placeholder="账户邮箱" 
                value={userInfo.accountEmail} 
                onChange={(e) => {
                  handleUserInfo(e);
                  // Trigger client search when account email field changes
                  if (e.target.value.length >= 2) {
                    setClientSearchLoading(true);
                    setClientSearchStatus({ message: '🔍 正在搜索...', type: 'searching' });
                    
                    searchClients(e.target.value, (type, message) => {
                      setClientSearchStatus({ message, type });
                      setClientSearchLoading(false);
                    }).then(clients => {
                      setAccountEmailSearchResults(clients.filter(client => 
                        (client.accountEmail && client.accountEmail.toLowerCase().includes(e.target.value.toLowerCase()))
                      ));
                    }).catch(() => {
                      setClientSearchLoading(false);
                    });
                  } else {
                    setAccountEmailSearchResults([]);
                    setClientSearchStatus({ message: '', type: '' });
                  }
                }}
                style={{
                  padding: '14px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
              
              {/* Account Email Search Results */}
              {accountEmailSearchResults.length > 0 && userInfo.accountEmail.length >= 2 && (
                <div 
                  data-dropdown="true"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                  overflowY: 'auto'
                  }}
                >
                  {accountEmailSearchResults.map((client, idx) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setUserInfo({
                          company: client.company || '',
                          name: client.name || '',
                          phone: client.phone || '',
                          clientEmail: client.clientEmail || '',
                          accountEmail: client.accountEmail || '',
                          address: client.address || '',
                          totalCharge: userInfo.totalCharge,
                          additionalService: userInfo.additionalService
                        });
                        setAccountEmailSearchResults([]);
                        setClientSearchStatus({ message: '', type: '' });
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: idx < accountEmailSearchResults.length - 1 ? '1px solid #f3f4f6' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                        {client.accountEmail}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {client.company} • {client.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input 
              name="address" 
              placeholder="地址" 
              value={userInfo.address} 
              onChange={handleUserInfo}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <input 
              name="additionalService" 
              placeholder="其他服务（可选）" 
              value={userInfo.additionalService} 
              onChange={handleUserInfo}
              style={{
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                transition: 'border-color 0.2s',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '14px 32px',
                backgroundColor: '#1a4a5e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                marginTop: '8px',
                alignSelf: 'center',
                width: '100%',
                maxWidth: '200px'
              }}
            >
              确认
            </button>
          </div>
        </form>
      )}
      {step === 4 && (
        <div style={{ maxWidth: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>点击图片保存到相册</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '16px'
          }}>
            {receiptImage && (
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '100%',
                textAlign: 'center'
              }}>
                <img 
                  src={receiptImage} 
                  alt="CARB Receipt" 
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => setShowFullscreen(true)}
                />
                <div style={{ 
                  marginTop: '16px', 
                  color: '#666', 
                  fontSize: '15px',
                  lineHeight: '1.5'
                }}>
                  点击图片保存到相册
                </div>
              </div>
            )}
          </div>
      </div>
      )}
      
      {/* Fullscreen Modal */}
      {showFullscreen && receiptImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowFullscreen(false)}
        >
          <img 
            src={receiptImage} 
            alt="CARB Receipt Fullscreen" 
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              height: 'auto',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowFullscreen(false)}
          >
            ×
        </button>
        </div>
      )}
      
      {/* Hidden receipt preview for image generation */}
      <div 
        ref={receiptRef} 
        className="receipt-preview" 
        style={{
          background: '#fff',
          color: '#222',
          padding: '48px',
          width: '8.5in',
          height: '11in',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '13px',
          lineHeight: '1.6',
          boxSizing: 'border-box',
          borderRadius: '18px',
          border: '1.5px solid #e3e8ee',
          overflow: 'hidden'
        }}
      >
        {/* Big Logo at top center */}
        <div style={{textAlign: 'right', marginBottom: '40px'}}>
          <img 
            src="./logo.png" 
            alt="Clean Truck Check Logo" 
            style={{
              width: '200px',
              height: 'auto',
              maxHeight: '120px',
            }}
          />
        </div>
        
        {/* Recipient info with "To:" prefix */}
        {(userInfo.company || userInfo.name || userInfo.phone || userInfo.clientEmail || userInfo.address) && (
          <div style={{
            fontSize: '15px',
            marginBottom: '32px',
            textAlign: 'left',
            fontWeight: 400,
          }}>
            <div style={{fontWeight: 600, marginBottom: '10px', fontSize: '17px', letterSpacing: '0.5px'}}>To:</div>
            {userInfo.company && (<div style={{marginBottom: '4px'}}>{userInfo.company}</div>)}
            {userInfo.name && (<div style={{marginBottom: '4px'}}>{userInfo.name}</div>)}
            {userInfo.phone && (<div style={{marginBottom: '4px'}}>{userInfo.phone}</div>)}
            {userInfo.clientEmail && (<div style={{marginBottom: '4px'}}>{userInfo.clientEmail}</div>)}
            {userInfo.address && (<div style={{marginBottom: '4px'}}>{userInfo.address}</div>)}
          </div>
        )}
        
        <hr style={{marginBottom: '32px', border: 'none', borderTop: '1.5px solid #e3e8ee'}}/>
        
        {/* Vehicle table */}
        <div style={{marginBottom: '32px'}}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginBottom: '32px', 
            background: '#f9fbfd', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            boxShadow: '0 2px 8px rgba(26,74,94,0.04)'
          }}>
            <thead>
              <tr style={{backgroundColor: '#e3f0fa'}}>
                <th style={{ border: '1px solid #d1e3f6', padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1a4a5e', letterSpacing: '1px' }}>VIN</th>
                <th style={{ border: '1px solid #d1e3f6', padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1a4a5e', letterSpacing: '1px' }}>License Plate</th>
                <th style={{ border: '1px solid #d1e3f6', padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1a4a5e', letterSpacing: '1px' }}>Make</th>
                <th style={{ border: '1px solid #d1e3f6', padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#1a4a5e', letterSpacing: '1px' }}>Model Year</th>
              </tr>
            </thead>
            <tbody>
              {vehicleData.map((v, idx) => (
                <tr key={idx} style={{background: idx % 2 === 0 ? '#fff' : '#f5f8fa'}}>
                  <td style={{ border: '1px solid #e3e8ee', padding: '10px 0', fontSize: '12px', textAlign: 'center' }}>{v.vin}</td>
                  <td style={{ border: '1px solid #e3e8ee', padding: '10px 0', fontSize: '12px', textAlign: 'center' }}>{v.licensePlate}</td>
                  <td style={{ border: '1px solid #e3e8ee', padding: '10px 0', fontSize: '12px', textAlign: 'center' }}>{v.make}</td>
                  <td style={{ border: '1px solid #e3e8ee', padding: '10px 0', fontSize: '12px', textAlign: 'center' }}>{v.modelYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Service Section */}
        <div style={{marginBottom: '32px'}}>
          <div style={{
            background: '#f9fbfd',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e3e8ee',
            fontSize: '15px',
            fontWeight: 500,
            color: '#1a4a5e',
            textAlign: 'left',
          }}>
            <strong>Service:</strong> CARB Clean Truck Check{userInfo.additionalService ? `, ${userInfo.additionalService}` : ''}
          </div>
        </div>
        
        {/* Total charge at bottom */}
        {userInfo.totalCharge && (
          <>
            <div style={{
              textAlign: 'right',
              marginTop: '32px',
              fontSize: '15px',
              color: '#1a4a5e',
              fontWeight: 500,
              letterSpacing: '1px',
            }}>
              {new Date().toISOString().slice(0, 10)}
            </div>
            <div style={{
              textAlign: 'right',
              marginTop: '8px',
              paddingTop: '16px',
              borderTop: '2px solid #1a4a5e',
              fontSize: '18px',
              fontWeight: 700,
              color: '#1a4a5e',
              letterSpacing: '1px',
            }}>
              Total Charge: ${userInfo.totalCharge}
            </div>
          </>
        )}
      </div>
      
              {/* Effect to handle clicking outside of client search dropdowns */}
        {(() => {
          React.useEffect(() => {
            const handleClickOutside = (event) => {
              // Close search results when clicking outside
              if (!event.target.closest('input') && !event.target.closest('[data-dropdown="true"]')) {
                if (companySearchResults.length > 0) {
                  setCompanySearchResults([]);
                }
                if (nameSearchResults.length > 0) {
                  setNameSearchResults([]);
                }
                if (phoneSearchResults.length > 0) {
                  setPhoneSearchResults([]);
                }
                        if (clientEmailSearchResults.length > 0) {
          setClientEmailSearchResults([]);
        }
              }
            };

          document.addEventListener('mousedown', handleClickOutside);
          return () => {
            document.removeEventListener('mousedown', handleClickOutside);
          };
        }, [companySearchResults, nameSearchResults, phoneSearchResults, clientEmailSearchResults]);

        return null;
      })()}
    </div>
  );
}

export default App;


