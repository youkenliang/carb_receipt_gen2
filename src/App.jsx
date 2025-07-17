import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import html2canvas from 'html2canvas';
import './App.css';

// Google Sheets integration function
async function saveToGoogleSheets(data) {
  // This will be replaced with your actual Google Apps Script web app URL
  const GOOGLE_SHEETS_WEBAPP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEBAPP_URL_HERE';
  
  try {
    const response = await fetch(GOOGLE_SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      console.log('Data saved to Google Sheets successfully');
      return true;
    } else {
      console.error('Failed to save to Google Sheets');
      return false;
    }
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    return false;
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

// Helper to check if a decoded VIN is valid
function isVinValid(decoded) {
  if (!decoded || !decoded.ErrorCode) return false;
  return decoded.ErrorCode === "0" || decoded.ErrorCode.startsWith("0,");
}

function App() {
  const [step, setStep] = useState(1);
  const [userInfo, setUserInfo] = useState({ company: '', name: '', phone: '', email: '', address: '', totalCharge: '', additionalService: '' });
  const [confirmedData, setConfirmedData] = useState({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const receiptRef = useRef();
  const [images, setImages] = useState([]);
  const [vehicleData, setVehicleData] = useState([]); // [{ image, vin, licensePlate, make, modelYear, vinApiError }]
  const [receiptImage, setReceiptImage] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Step 1: Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imgUrl = URL.createObjectURL(file);
      setImages(prev => [...prev, imgUrl]);
      setVehicleData(prev => [...prev, { image: imgUrl, file, vin: '', licensePlate: '', make: '', modelYear: '', vinApiError: false }]);
    }
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
  };

  // Step 4: Confirm/Edit Data
  const handleConfirmChange = (e) => {
    setOcrData({ ...ocrData, [e.target.name]: e.target.value });
  };
  const handleConfirmSubmit = async (e) => {
    e.preventDefault();
    setConfirmedData({ ...userInfo });
    
    // Prepare data for Google Sheets
    const receiptData = {
      date: new Date().toISOString().slice(0, 10),
      totalCharge: userInfo.totalCharge,
      company: userInfo.company,
      name: userInfo.name,
      phone: userInfo.phone,
      email: userInfo.email,
      address: userInfo.address,
      additionalService: userInfo.additionalService,
      vehicles: vehicleData.map(v => ({
        vin: v.vin,
        licensePlate: v.licensePlate,
        make: v.make,
        modelYear: v.modelYear
      }))
    };
    
    // Generate receipt image
    try {
      if (!receiptRef.current) {
        console.log('Receipt ref not found');
        return;
      }
      
      console.log('Starting html2canvas conversion...');
      const canvas = await html2canvas(receiptRef.current);
      console.log('Canvas created successfully');
      
      // Convert canvas to data URL and set it
      const imageDataUrl = canvas.toDataURL('image/png');
      setReceiptImage(imageDataUrl);
      setStep(4);
      
      // Save data to Google Sheets (non-blocking)
      saveToGoogleSheets(receiptData).then(success => {
        if (success) {
          console.log('Receipt data saved to spreadsheet');
        } else {
          console.log('Failed to save receipt data to spreadsheet');
        }
      });
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Error generating receipt image. Please try again.');
    }
  };

  // Step 5: Receipt Preview and Download
  const handleDownload = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current);
    const link = document.createElement('a');
    link.download = 'receipt.png';
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
                    const { data } = await Tesseract.recognize(v.file, 'eng', { logger: (m) => {} });
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
                          {v.vinApiError ? '' : (v.make || 'Not available')}
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
                          {v.vinApiError ? '' : (v.modelYear || 'Not available')}
                        </div>
                      </div>
                    </div>
                    {v.vinApiError && (
                      <div style={{ color: '#d32f2f', fontSize: '13px', marginTop: '8px' }}>
                        车辆信息未能获取，可能是网络或服务器问题
                      </div>
                    )}
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
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textAlign: 'center' }}>第三步：填写顾客信息（可跳过）</h2>
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
            <input 
              name="company" 
              placeholder="公司" 
              value={userInfo.company} 
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
              name="name" 
              placeholder="姓名" 
              value={userInfo.name} 
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
              name="phone" 
              placeholder="电话" 
              value={userInfo.phone} 
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
              name="email" 
              placeholder="邮箱" 
              value={userInfo.email} 
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
            src="/logo.png" 
            alt="Clean Truck Check Logo" 
            style={{
              width: '200px',
              height: 'auto',
              maxHeight: '120px',
            }}
          />
        </div>
        
        {/* Recipient info with "To:" prefix */}
        {(userInfo.company || userInfo.name || userInfo.phone || userInfo.email || userInfo.address) && (
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
            {userInfo.email && (<div style={{marginBottom: '4px'}}>{userInfo.email}</div>)}
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
    </div>
  );
}

export default App;

