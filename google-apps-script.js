// Google Apps Script to handle receipt data and save to Google Sheets
// Deploy this as a web app to get the URL for your React app

// Your specific spreadsheet ID
const SPREADSHEET_ID = '1Eu_Lpu6vAfKCaQAZgg7Y2dc5YiUrfrsHyteLDAmhSog';
// Your specific sheet name
const SHEET_NAME = 'receipt_gen2';

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the specific spreadsheet by ID and sheet by name
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found');
    }
    
    // Prepare the row data
    const rowData = [
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
    
    // Append the data to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Data saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to set up the spreadsheet headers (run this once)
function setupHeaders() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" not found');
  }
  
  const headers = [
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
}

// Test function to verify connection
function testConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
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
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Successfully opened spreadsheet: ' + spreadsheet.getName());
    
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_NAME + '" not found');
      Logger.log('Available sheets: ' + spreadsheet.getSheets().map(s => s.getName()).join(', '));
      return;
    }
    
    Logger.log('✅ Found target sheet: ' + sheet.getName());
    
    // Try to get the first cell to test access
    const firstCell = sheet.getRange(1, 1).getValue();
    Logger.log('✅ First cell value: ' + firstCell);
    
    Logger.log('=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('=== TEST FAILED ===');
  }
} 