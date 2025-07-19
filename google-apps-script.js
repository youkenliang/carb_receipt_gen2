// Google Apps Script for CARB Receipt Generator
// Deploy this as a web app

// Configuration
var SPREADSHEET_ID = '1Eu_Lpu6vAfKCaQAZgg7Y2dc5YiUrfrsHyteLDAmhSog';
var SHEET_NAME = 'receipt_gen2';

// Handle GET requests (for testing)
function doGet(e) {
  var response = ContentService.createTextOutput(JSON.stringify({ 
    status: 'ok', 
    message: 'Google Apps Script is running',
    timestamp: new Date().toISOString()
  }));
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}

// Handle OPTIONS requests (CORS preflight) - simplified version
function doOptions(e) {
  Logger.log('=== OPTIONS REQUEST RECEIVED ===');
  var response = ContentService.createTextOutput('');
  response.setMimeType(ContentService.MimeType.TEXT);
  Logger.log('=== OPTIONS RESPONSE SENT (no headers) ===');
  return response;
}

// Handle POST requests (main functionality)
function doPost(e) {
  try {
    Logger.log('Received POST request');
    Logger.log('Request data: ' + e.postData.contents);
    Logger.log('Content type: ' + e.postData.type);
    
    var data;
    
    // Handle different content types
    if (e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else if (e.postData.type === 'application/x-www-form-urlencoded') {
      // Handle form data
      var params = e.parameter;
      if (params.data) {
        data = JSON.parse(params.data);
      } else {
        // Try to parse the raw content as JSON
        data = JSON.parse(e.postData.contents);
      }
    } else {
      // Try to parse as JSON anyway
      data = JSON.parse(e.postData.contents);
    }
    
    Logger.log('Parsed data: ' + JSON.stringify(data));
    
    // Get the specific spreadsheet by ID and sheet by name
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found');
    }
    
    Logger.log('Successfully opened spreadsheet and sheet');
    
    // Prepare the row data
    var rowData = [
      data.date,
      data.totalCharge,
      data.company,
      data.name,
      data.phone,
      data.email,
      data.address,
      data.additionalService,
      data.vehicles.length,
      JSON.stringify(data.vehicles) // Store vehicle details as JSON
    ];
    
    Logger.log('Prepared row data: ' + JSON.stringify(rowData));
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    Logger.log('Data appended successfully');
    
    // Return success response
    var response = ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Data saved successfully',
      timestamp: new Date().toISOString()
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    
    // Return error response
    var response = ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString(),
      timestamp: new Date().toISOString()
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
  }
}

// Test function to simulate an OPTIONS request
function testOptionsRequest() {
  Logger.log('=== TESTING OPTIONS REQUEST ===');
  
  // Create a mock OPTIONS request event
  var mockEvent = {
    parameter: {},
    queryString: ''
  };
  
  try {
    Logger.log('Calling doOptions with mock data...');
    var result = doOptions(mockEvent);
    Logger.log('doOptions result: ' + result.getContent());
    Logger.log('=== OPTIONS TEST COMPLETED ===');
    return true;
  } catch (error) {
    Logger.log('❌ OPTIONS TEST FAILED: ' + error.toString());
    Logger.log('=== OPTIONS TEST FAILED ===');
    return false;
  }
}

// Test function to simulate a POST request
function testPostRequest() {
  Logger.log('=== TESTING POST REQUEST ===');
  
  // Create a mock POST request event
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        date: '2025-07-19',
        totalCharge: '120',
        company: 'Test Company',
        name: 'Test User',
        phone: '555-1234',
        email: 'test@example.com',
        address: '123 Test St',
        additionalService: 'Test Service',
        vehicles: [
          {
            vin: '5PVNJ8JT9L5S60298',
            licensePlate: '43312W2',
            make: 'HINO',
            modelYear: '2020'
          }
        ]
      }),
      type: 'application/json'
    }
  };
  
  try {
    Logger.log('Calling doPost with mock data...');
    var result = doPost(mockEvent);
    Logger.log('doPost result: ' + result.getContent());
    Logger.log('=== POST TEST COMPLETED SUCCESSFULLY ===');
    return true;
  } catch (error) {
    Logger.log('❌ POST TEST FAILED: ' + error.toString());
    Logger.log('=== POST TEST FAILED ===');
    return false;
  }
}

// Function to set up the spreadsheet headers (run this once)
function setupHeaders() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" not found');
  }
  
  var headers = [
    'Date',
    'Total Charge',
    'Company',
    'Name',
    'Phone',
    'Email',
    'Address',
    'Additional Service',
    'Number of Vehicles',
    'Vehicle Details'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  Logger.log('Headers set up successfully');
}

// Test function to verify connection
function testConnection() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_NAME + '" not found');
      return false;
    }
    
    Logger.log('✅ Successfully connected to spreadsheet: ' + spreadsheet.getName());
    Logger.log('✅ Found sheet: ' + sheet.getName());
    return true;
  } catch (error) {
    Logger.log('❌ Error connecting to spreadsheet: ' + error.toString());
    return false;
  }
}

// Simple test function - run this first
function simpleTest() {
  Logger.log('=== SIMPLE TEST STARTED ===');
  Logger.log('Current time: ' + new Date().toString());
  Logger.log('Spreadsheet ID: ' + SPREADSHEET_ID);
  Logger.log('Target Sheet: ' + SHEET_NAME);
  
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Successfully opened spreadsheet: ' + spreadsheet.getName());
    
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_NAME + '" not found');
      Logger.log('Available sheets: ' + spreadsheet.getSheets().map(function(s) { return s.getName(); }).join(', '));
      return;
    }
    
    Logger.log('✅ Found target sheet: ' + sheet.getName());
    
    // Try to get the first cell to test access
    var firstCell = sheet.getRange(1, 1).getValue();
    Logger.log('✅ First cell value: ' + firstCell);
    
    Logger.log('=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('=== TEST FAILED ===');
  }
} 