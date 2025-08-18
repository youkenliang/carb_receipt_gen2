// Google Apps Script for CARB Receipt Generator
// Deploy this as a web app

// Configuration
var SPREADSHEET_ID = '1Eu_Lpu6vAfKCaQAZgg7Y2dc5YiUrfrsHyteLDAmhSog';
var SHEET_NAME = 'receipt_gen2';

// Handle GET requests (for testing and JSONP)
function doGet(e) {
  try {
    // Check if this is a client search request
    var action = e.parameter.action;
    var searchTerm = e.parameter.searchTerm;
    
    if (action === 'searchClients' && searchTerm) {
      Logger.log('GET request for client search: ' + searchTerm);
      return handleClientSearch(searchTerm);
    }
    
    // Default response for testing
    var response = ContentService.createTextOutput(JSON.stringify({ 
      status: 'ok', 
      message: 'Google Apps Script is running',
      timestamp: new Date().toISOString()
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    var response = ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      error: error.toString(),
      timestamp: new Date().toISOString()
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
  }
}

// Handle OPTIONS requests (CORS preflight)
function doOptions(e) {
  var response = ContentService.createTextOutput('');
  response.setMimeType(ContentService.MimeType.TEXT);
  return response;
}

// Function to handle client search requests
function handleClientSearch(searchTerm) {
  try {
    Logger.log('Searching for clients with term: ' + searchTerm);
    
    // Get the spreadsheet and sheet
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found');
    }
    
    // Get all data from the sheet
    var data = sheet.getDataRange().getValues();
    var headers = data[0]; // First row contains headers
    
    // Find the column indices for client fields
    var companyCol = headers.indexOf('Company');
    var nameCol = headers.indexOf('Name');
    var phoneCol = headers.indexOf('Phone');
    var clientEmailCol = headers.indexOf('Client Email');
    var accountEmailCol = headers.indexOf('Account Email');
    var addressCol = headers.indexOf('Address');
    
    if (companyCol === -1 || nameCol === -1 || phoneCol === -1) {
      throw new Error('Required columns not found in sheet');
    }
    
    // Log column positions for debugging
    Logger.log('Column positions: Company=' + companyCol + ', Name=' + nameCol + ', Phone=' + phoneCol + ', Client Email=' + emailCol + ', Account Email=' + accountEmailCol + ', Address=' + addressCol);
    
    // Search through existing receipt data to find unique clients
    var clients = [];
    var seenClients = {}; // Track unique clients by company+name+phone
    
    // Start from row 2 (skip headers)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var company = row[companyCol] || '';
      var name = row[nameCol] || '';
      var phone = row[phoneCol] || '';
      var clientEmail = row[clientEmailCol] || '';
      var accountEmail = row[accountEmailCol] || '';
      var address = row[addressCol] || '';
      
      // Skip rows without company, name, or phone
      if (!company && !name && !phone) continue;
      
      // Create a unique key for this client
      var clientKey = (company + name + phone).toLowerCase();
      
      // Check if this client matches the search term
      var matches = false;
      if (searchTerm) {
        // Convert all fields to strings for safe searching
        var companyStr = String(company || '');
        var nameStr = String(name || '');
        var phoneStr = String(phone || '');
        var clientEmailStr = String(clientEmail || '');
        var accountEmailStr = String(accountEmail || '');
        
        matches = companyStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 phoneStr.includes(searchTerm) ||
                 clientEmailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 accountEmailStr.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      // If it matches and we haven't seen this client before, add it
      if (matches && !seenClients[clientKey]) {
        seenClients[clientKey] = true;
        clients.push({
          id: i, // Use row number as ID
          company: company,
          name: name,
          phone: phone,
          clientEmail: clientEmail,
          accountEmail: accountEmail,
          address: address
        });
      }
    }
    
    Logger.log('Found ' + clients.length + ' matching clients');
    
    // Return the results
    var response = ContentService.createTextOutput(JSON.stringify({
      success: true,
      clients: clients,
      count: clients.length
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
    
  } catch (error) {
    Logger.log('Error in handleClientSearch: ' + error.toString());
    
    var response = ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      clients: []
    }));
    response.setMimeType(ContentService.MimeType.JSON);
    return response;
  }
}

// Handle POST requests (main functionality)
function doPost(e) {
  try {
    Logger.log('=== POST REQUEST RECEIVED ===');
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
    
    // Check if this is a client search request
    if (data.action === 'searchClients') {
      Logger.log('Handling client search request for: ' + data.searchTerm);
      var searchResult = handleClientSearch(data.searchTerm);
      Logger.log('Search result: ' + searchResult.getContent());
      return searchResult;
    }
    
    // Get the specific spreadsheet by ID and sheet by name
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found');
    }
    
    Logger.log('Successfully opened spreadsheet and sheet');
    
    // Get headers to find column positions dynamically
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('Sheet headers: ' + headers.join(', '));
    
    // Find column positions by name - UPDATED to match your exact structure
    var dateCol = headers.indexOf('Date');
    var totalChargeCol = headers.indexOf('Total Charge');
    var companyCol = headers.indexOf('Company');
    var nameCol = headers.indexOf('Name');
    var phoneCol = headers.indexOf('Phone');
    var clientEmailCol = headers.indexOf('Client Email');
    var accountEmailCol = headers.indexOf('Account Email');
    var passwordCol = headers.indexOf('Password');
    var addressCol = headers.indexOf('Address');
    var additionalServiceCol = headers.indexOf('Additional Service');
    var numberOfVehiclesCol = headers.indexOf('Number of Vehicles');
    var vehicleDetailsCol = headers.indexOf('Vehicle Details');
    var commentsCol = headers.indexOf('Comments');
    
    // Log column positions for debugging
    Logger.log('Column positions found: Date=' + dateCol + ', Total Charge=' + totalChargeCol + ', Company=' + companyCol + ', Name=' + nameCol + ', Phone=' + phoneCol + ', Client Email=' + clientEmailCol + ', Account Email=' + accountEmailCol + ', Password=' + passwordCol + ', Address=' + addressCol);
    
    // Validate required columns exist
    if (dateCol === -1 || companyCol === -1 || nameCol === -1 || phoneCol === -1) {
      throw new Error('Required columns not found in sheet. Found headers: ' + headers.join(', '));
    }
    
    // Create an array with the correct number of columns (matching sheet structure)
    var maxCols = Math.max(dateCol, totalChargeCol, companyCol, nameCol, phoneCol, clientEmailCol, accountEmailCol, passwordCol, addressCol, additionalServiceCol, numberOfVehiclesCol, vehicleDetailsCol, commentsCol) + 1;
    var rowData = new Array(maxCols).fill(''); // Initialize with empty strings
    
    // Place data in correct columns based on found positions
    if (dateCol >= 0) {
      // Format date consistently with existing rows - using PDT timezone
      var today = new Date();
      var formattedDate = Utilities.formatDate(today, 'America/Los_Angeles', 'yyyy-MM-dd');
      rowData[dateCol] = formattedDate;
    }
    if (totalChargeCol >= 0) rowData[totalChargeCol] = data.totalCharge || '';
    if (companyCol >= 0) rowData[companyCol] = data.company || '';
    if (nameCol >= 0) rowData[nameCol] = data.name || '';
    if (phoneCol >= 0) rowData[phoneCol] = data.phone || '';
    if (clientEmailCol >= 0) rowData[clientEmailCol] = data.clientEmail || '';
    if (accountEmailCol >= 0) rowData[accountEmailCol] = data.accountEmail || '';
    if (passwordCol >= 0) rowData[passwordCol] = ''; // Password field (blank for now)
    if (addressCol >= 0) rowData[addressCol] = data.address || '';
    if (additionalServiceCol >= 0) rowData[additionalServiceCol] = data.additionalService || '';
    if (numberOfVehiclesCol >= 0) rowData[numberOfVehiclesCol] = data.vehicles ? data.vehicles.length : 0;
    if (vehicleDetailsCol >= 0) rowData[vehicleDetailsCol] = data.vehicles ? JSON.stringify(data.vehicles) : '';
    if (commentsCol >= 0) rowData[commentsCol] = ''; // Comments field (blank for now)
    
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
    Logger.log('❌ Error in doPost: ' + error.toString());
    
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
    'Client Email',
    'Account Email',
    'Password',
    'Address',
    'Additional Service',
    'Number of Vehicles',
    'Vehicle Details',
    'Comments'
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

// Simple test function to verify the script is accessible
function doGetTest(e) {
  return ContentService.createTextOutput('Hello from Google Apps Script!');
}

// Test function to verify client search
function testClientSearch() {
  try {
    Logger.log('=== TESTING CLIENT SEARCH ===');
    var result = handleClientSearch('truck');
    Logger.log('Search result: ' + result.getContent());
    Logger.log('=== CLIENT SEARCH TEST COMPLETED ===');
    return true;
  } catch (error) {
    Logger.log('❌ CLIENT SEARCH TEST FAILED: ' + error.toString());
    return false;
  }
}

// Function to check current sheet structure
function checkSheetStructure() {
  try {
    Logger.log('=== CHECKING SHEET STRUCTURE ===');
    
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_NAME + '" not found');
      return false;
    }
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log('📋 Current headers: ' + headers.join(', '));
    
    Logger.log('🔍 Column mapping:');
    headers.forEach((header, index) => {
      Logger.log('  Column ' + index + ': "' + header + '"');
    });
    
    Logger.log('✅ Sheet structure check completed');
    return true;
    
  } catch (error) {
    Logger.log('❌ Sheet structure check failed: ' + error.toString());
    return false;
  }
} 