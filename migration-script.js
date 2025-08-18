/**
 * Migration Script: Merge "Cleaned Data" into "receipt_gen2"
 * This is a ONE-TIME USE script to migrate historical client data
 * 
 * Instructions:
 * 1. Copy this script to Google Apps Script
 * 2. Run the main() function
 * 3. Review the logs for any issues
 * 4. Delete this script after successful migration
 */

// Configuration - UPDATE THESE VALUES
var SPREADSHEET_ID = '1Eu_Lpu6vAfKCaQAZgg7Y2dc5YiUrfrsHyteLDAmhSog';
var CLEANED_DATA_SHEET = 'Cleaned Data';
var RECEIPT_GEN2_SHEET = 'receipt_gen2';

function main() {
  console.log('🚀 Starting migration from "Cleaned Data" to "receipt_gen2"');
  
  try {
    // Step 1: Create backup of "Cleaned Data"
    createBackup();
    
    // Step 2: Get source data from "Cleaned Data"
    const sourceData = getSourceData();
    console.log(`📊 Found ${sourceData.length} rows in "Cleaned Data"`);
    
    // Step 3: Transform and prepare data for migration
    const transformedData = transformData(sourceData);
    console.log(`🔄 Transformed ${transformedData.length} rows`);
    
    // Step 4: Insert transformed data at the top of "receipt_gen2"
    insertTransformedData(transformedData);
    
    // Step 5: Verify migration
    verifyMigration(sourceData.length);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

function createBackup() {
  console.log('📋 Creating backup of "Cleaned Data" sheet...');
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sourceSheet = spreadsheet.getSheetByName(CLEANED_DATA_SHEET);
  
  if (!sourceSheet) {
    throw new Error(`Sheet "${CLEANED_DATA_SHEET}" not found!`);
  }
  
  // Create backup sheet with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `Cleaned Data - Backup ${timestamp}`;
  
  const backupSheet = sourceSheet.copyTo(spreadsheet);
  backupSheet.setName(backupName);
  
  console.log(`✅ Backup created: "${backupName}"`);
}

function getSourceData() {
  console.log(`📥 Reading data from "${CLEANED_DATA_SHEET}" sheet...`);
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sourceSheet = spreadsheet.getSheetByName(CLEANED_DATA_SHEET);
  
  if (!sourceSheet) {
    throw new Error(`Sheet "${CLEANED_DATA_SHEET}" not found!`);
  }
  
  const data = sourceSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1); // Skip header row
  
  console.log('📋 Source headers:', headers);
  
  return { headers, rows };
}

function transformData(sourceData) {
  console.log('🔄 Transforming data...');
  
  const { headers, rows } = sourceData;
  const transformedRows = [];
  
  // Log all headers for debugging
  console.log('📋 All source headers:', headers);
  
  // Get column indices from source - FIXED based on actual headers
  const sourceIndices = {
    name: headers.indexOf('Name'),
    company: headers.indexOf('Company'),
    phone: headers.indexOf('Phone'),
    accountEmail: headers.indexOf('Account Email'),
    password: headers.indexOf('Password'),
    addressStreet: headers.indexOf('Address Street'), // Combined field
    city: headers.indexOf('City'),
    postalCode: headers.indexOf('Postal code'),
    testDate: headers.indexOf('Test date'),
    receiptNumber: headers.indexOf('Receipt Number'), // Fixed: "Receipt Number" not "ReceiptNumber"
    unit: headers.indexOf('Unit'),
    price1: headers.indexOf('price1'),
    discount: headers.indexOf('Discount'),
    vin1: headers.indexOf('VIN1'),
    licensePlate1: headers.indexOf('License plate1'),
    make1: headers.indexOf('Make1'),
    modelYear1: headers.indexOf('Model year1'),
    regMonth1: headers.indexOf('Registration month1'),
    vin2: headers.indexOf('VIN2'),
    licensePlate2: headers.indexOf('License plate2'),
    make2: headers.indexOf('Make2'),
    modelYear2: headers.indexOf('Model year2'),
    regMonth2: headers.indexOf('Registration month2'),
    vin3: headers.indexOf('VIN3'),
    licensePlate3: headers.indexOf('License plate3'),
    make3: headers.indexOf('Make3'),
    modelYear3: headers.indexOf('Model year3'),
    regMonth3: headers.indexOf('Registration month3'),
    vin4: headers.indexOf('VIN4'),
    licensePlate4: headers.indexOf('License plate4'),
    make4: headers.indexOf('Make4'),
    modelYear4: headers.indexOf('Model year4'),
    regMonth4: headers.indexOf('Registration month4'),
    vin5: headers.indexOf('VIN5'),
    licensePlate5: headers.indexOf('License plate5'),
    make5: headers.indexOf('Make5'),
    modelYear5: headers.indexOf('Model year5'),
    regMonth5: headers.indexOf('Registration month5'),
    clientEmail: headers.indexOf('Email'), // This is the Client Email field!
    comments: headers.indexOf('Comments'),
    emailFee: headers.indexOf('fee'),
    price2: headers.indexOf('price2'),
    price3: headers.indexOf('price3')
  };
  
  // Log column positions for debugging
  console.log('📍 Source column indices:', sourceIndices);
  
  rows.forEach((row, index) => {
    try {
      console.log(`\n🔄 Processing row ${index + 1}:`, row);
      
      // Extract values with null checks and safe indexing - FIXED
      const name = sourceIndices.name >= 0 ? (row[sourceIndices.name] || '') : '';
      const company = sourceIndices.company >= 0 ? (row[sourceIndices.company] || '') : '';
      const phone = sourceIndices.phone >= 0 ? (row[sourceIndices.phone] || '') : '';
      const accountEmail = sourceIndices.accountEmail >= 0 ? (row[sourceIndices.accountEmail] || '') : '';
      const password = sourceIndices.password >= 0 ? (row[sourceIndices.password] || '') : '';
      const addressStreet = sourceIndices.addressStreet >= 0 ? (row[sourceIndices.addressStreet] || '') : '';
      const city = sourceIndices.city >= 0 ? (row[sourceIndices.city] || '') : '';
      const postalCode = sourceIndices.postalCode >= 0 ? (row[sourceIndices.postalCode] || '') : '';
      const testDate = sourceIndices.testDate >= 0 ? (row[sourceIndices.testDate] || '') : '';
      const receiptNumber = sourceIndices.receiptNumber >= 0 ? (row[sourceIndices.receiptNumber] || '') : '';
      const unit = sourceIndices.unit >= 0 ? (row[sourceIndices.unit] || '') : '';
      const price1 = sourceIndices.price1 >= 0 ? (row[sourceIndices.price1] || 0) : 0;
      const discount = sourceIndices.discount >= 0 ? (row[sourceIndices.discount] || 0) : 0;
      const clientEmail = sourceIndices.clientEmail >= 0 ? (row[sourceIndices.clientEmail] || '') : '';
      const comments = sourceIndices.comments >= 0 ? (row[sourceIndices.comments] || '') : '';
      const emailFee = sourceIndices.emailFee >= 0 ? (row[sourceIndices.emailFee] || '') : '';
      const price2 = sourceIndices.price2 >= 0 ? (row[sourceIndices.price2] || '') : '';
      const price3 = sourceIndices.price3 >= 0 ? (row[sourceIndices.price3] || '') : '';
      
      // Build combined address - FIXED
      let combinedAddress = '';
      if (addressStreet) combinedAddress += addressStreet;
      if (city) combinedAddress += (combinedAddress ? ', ' : '') + city;
      if (postalCode) combinedAddress += (combinedAddress ? ' ' : '') + postalCode;
      
      // Calculate total charge: price1 × Unit
      const totalCharge = (parseFloat(price1) || 0) * (parseFloat(unit) || 0);
      
      // Build vehicles JSON
      const vehicles = [];
      
      // Vehicle 1
      if (sourceIndices.vin1 >= 0 && (row[sourceIndices.vin1] || row[sourceIndices.licensePlate1] || row[sourceIndices.make1])) {
        vehicles.push({
          vin: row[sourceIndices.vin1] || '',
          licensePlate: row[sourceIndices.licensePlate1] || '',
          make: row[sourceIndices.make1] || '',
          modelYear: row[sourceIndices.modelYear1] || '',
          registrationMonth: row[sourceIndices.regMonth1] || ''
        });
      }
      
      // Vehicle 2
      if (sourceIndices.vin2 >= 0 && (row[sourceIndices.vin2] || row[sourceIndices.licensePlate2] || row[sourceIndices.make2])) {
        vehicles.push({
          vin: row[sourceIndices.vin2] || '',
          licensePlate: row[sourceIndices.licensePlate2] || '',
          make: row[sourceIndices.make2] || '',
          modelYear: row[sourceIndices.modelYear2] || '',
          registrationMonth: row[sourceIndices.regMonth2] || ''
        });
      }
      
      // Vehicle 3
      if (sourceIndices.vin3 >= 0 && (row[sourceIndices.vin3] || row[sourceIndices.licensePlate3] || row[sourceIndices.make3])) {
        vehicles.push({
          vin: row[sourceIndices.vin3] || '',
          licensePlate: row[sourceIndices.licensePlate3] || '',
          make: row[sourceIndices.make3] || '',
          modelYear: row[sourceIndices.modelYear3] || '',
          registrationMonth: row[sourceIndices.regMonth3] || ''
        });
      }
      
      // Vehicle 4
      if (sourceIndices.vin4 >= 0 && (row[sourceIndices.vin4] || row[sourceIndices.licensePlate4] || row[sourceIndices.make4])) {
        vehicles.push({
          vin: row[sourceIndices.vin4] || '',
          licensePlate: row[sourceIndices.licensePlate4] || '',
          make: row[sourceIndices.make4] || '',
          modelYear: row[sourceIndices.modelYear4] || '',
          registrationMonth: row[sourceIndices.regMonth4] || ''
        });
      }
      
      // Vehicle 5
      if (sourceIndices.vin5 >= 0 && (row[sourceIndices.vin5] || row[sourceIndices.licensePlate5] || row[sourceIndices.make5])) {
        vehicles.push({
          vin: row[sourceIndices.vin5] || '',
          licensePlate: row[sourceIndices.licensePlate5] || '',
          make: row[sourceIndices.make5] || '',
          modelYear: row[sourceIndices.modelYear5] || '',
          registrationMonth: row[sourceIndices.regMonth5] || ''
        });
      }
      
      // Create transformed row matching receipt_gen2 structure - UPDATED with all fields
      const transformedRow = [
        testDate,                    // Date
        totalCharge,                 // Total Charge (calculated: price1 × Unit)
        company,                     // Company
        name,                        // Name
        phone,                       // Phone
        clientEmail,                 // Client Email (from "Email" column)
        accountEmail,                // Account Email
        password,                    // Password
        combinedAddress,             // Address
        '',                          // Additional Service (blank for now)
        vehicles.length,             // Number of Vehicles
        JSON.stringify(vehicles),    // Vehicle Details (JSON)
        comments                     // Comments
      ];
      
      transformedRows.push(transformedRow);
      
    } catch (error) {
      console.error(`❌ Error transforming row ${index + 1}:`, error);
      console.error('Row data:', row);
    }
  });
  
  console.log(`✅ Successfully transformed ${transformedRows.length} rows`);
  return transformedRows;
}

function insertTransformedData(transformedData) {
  console.log(`📤 Inserting transformed data into "${RECEIPT_GEN2_SHEET}"...`);
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetSheet = spreadsheet.getSheetByName(RECEIPT_GEN2_SHEET);
  
  if (!targetSheet) {
    throw new Error(`Sheet "${RECEIPT_GEN2_SHEET}" not found!`);
  }
  
  // Get current data to find insertion point
  const currentData = targetSheet.getDataRange().getValues();
  const currentHeaders = currentData[0];
  const currentRows = currentData.slice(1);
  
  console.log(`📊 Current "receipt_gen2" has ${currentRows.length} rows`);
  
  // Insert transformed data at the top (after headers)
  if (transformedData.length > 0) {
    // Insert rows above existing data
    targetSheet.insertRowsAfter(1, transformedData.length);
    
    // Write transformed data starting from row 2 (after headers)
    const range = targetSheet.getRange(2, 1, transformedData.length, transformedData[0].length);
    range.setValues(transformedData);
    
    console.log(`✅ Inserted ${transformedData.length} rows at the top of "receipt_gen2"`);
  }
}

function verifyMigration(expectedCount) {
  console.log('🔍 Verifying migration...');
  
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetSheet = spreadsheet.getSheetByName(RECEIPT_GEN2_SHEET);
  
  if (!targetSheet) {
    throw new Error(`Sheet "${RECEIPT_GEN2_SHEET}" not found!`);
  }
  
  const currentData = targetSheet.getDataRange().getValues();
  const currentRows = currentData.slice(1); // Skip headers
  
  console.log(`📊 "receipt_gen2" now has ${currentRows.length} rows`);
  
  if (currentRows.length >= expectedCount) {
    console.log('✅ Migration verification successful!');
  } else {
    console.warn('⚠️ Migration verification: Row count mismatch');
    console.warn(`Expected at least ${expectedCount} rows, found ${currentRows.length}`);
  }
}

// Test function to check column mapping
function testColumnMapping() {
  console.log('🧪 Testing column mapping...');
  
  const sourceData = getSourceData();
  const { headers, rows } = sourceData;
  
  console.log('📋 All source headers:');
  headers.forEach((header, index) => {
    console.log(`${index}: "${header}"`);
  });
  
  if (rows.length > 0) {
    console.log('\n📊 Sample row data:');
    console.log('Headers:', headers);
    console.log('First row:', rows[0]);
  }
}

// Enhanced column mapping test
function testColumnMappingDetailed() {
  console.log('🔍 Detailed column mapping test...');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sourceSheet = spreadsheet.getSheetByName(CLEANED_DATA_SHEET);
    
    if (!sourceSheet) {
      console.error(`❌ Sheet "${CLEANED_DATA_SHEET}" not found`);
      return;
    }
    
    const data = sourceSheet.getDataRange().getValues();
    const headers = data[0];
    
    console.log(`📊 Found ${headers.length} columns in "${CLEANED_DATA_SHEET}"`);
    console.log('\n📋 All column headers with indices:');
    headers.forEach((header, index) => {
      console.log(`${index}: "${header}"`);
    });
    
    // Check specific expected columns
    console.log('\n🎯 Checking expected columns:');
    const expectedColumns = [
      'Name', 'Company', 'Phone', 'Account Email', 'Email', 'Password', 
      'Address Street', 'City', 'Postal code', 'Test date', 
      'Receipt Number', 'Unit', 'price1', 'Discount', 'VIN1', 
      'License plate1', 'Make1', 'Model year1', 'Registration month1'
    ];
    
    expectedColumns.forEach(expected => {
      const index = headers.indexOf(expected);
      if (index >= 0) {
        console.log(`✅ "${expected}" found at column ${index}`);
      } else {
        console.log(`❌ "${expected}" NOT FOUND`);
        
        // Try to find similar columns
        const similar = headers.filter(h => 
          h && h.toString().toLowerCase().includes(expected.toLowerCase())
        );
        if (similar.length > 0) {
          console.log(`   💡 Similar columns found: ${similar.join(', ')}`);
        }
      }
    });
    
    // Show first row data for verification
    if (data.length > 1) {
      console.log('\n📊 First row data sample:');
      const firstRow = data[1];
      headers.forEach((header, index) => {
        if (index < 10) { // Show first 10 columns
          console.log(`   ${index}: "${header}" = "${firstRow[index]}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Detailed test failed:', error);
  }
}

// Test spreadsheet connection
function testConnection() {
  console.log('🔗 Testing spreadsheet connection...');
  console.log('📋 Spreadsheet ID:', SPREADSHEET_ID);
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (spreadsheet) {
      console.log('✅ Successfully connected to spreadsheet');
      console.log('📊 Spreadsheet name:', spreadsheet.getName());
      console.log('🔗 Spreadsheet URL:', spreadsheet.getUrl());
    } else {
      console.error('❌ Failed to open spreadsheet');
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

// Debug function to list all available sheets
function listAllSheets() {
  console.log('📋 Listing all available sheets...');
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (!spreadsheet) {
      console.error('❌ No spreadsheet found with ID:', SPREADSHEET_ID);
      return;
    }
    
    const sheets = spreadsheet.getSheets();
    console.log(`📊 Found ${sheets.length} sheets:`);
    
    sheets.forEach((sheet, index) => {
      const sheetName = sheet.getName();
      const rowCount = sheet.getLastRow();
      const colCount = sheet.getLastColumn();
      console.log(`${index + 1}: "${sheetName}" (${rowCount} rows × ${colCount} columns)`);
    });
    
    // Check if target sheets exist
    const cleanedDataSheet = spreadsheet.getSheetByName(CLEANED_DATA_SHEET);
    const receiptGen2Sheet = spreadsheet.getSheetByName(RECEIPT_GEN2_SHEET);
    
    console.log('\n🎯 Target sheet status:');
    console.log(`"${CLEANED_DATA_SHEET}": ${cleanedDataSheet ? '✅ Found' : '❌ Not found'}`);
    console.log(`"${RECEIPT_GEN2_SHEET}": ${receiptGen2Sheet ? '✅ Found' : '❌ Not found'}`);
    
    if (cleanedDataSheet) {
      const headers = cleanedDataSheet.getRange(1, 1, 1, cleanedDataSheet.getLastColumn()).getValues()[0];
      console.log(`\n📋 "${CLEANED_DATA_SHEET}" headers:`, headers);
    }
    
  } catch (error) {
    console.error('❌ Error listing sheets:', error);
  }
}

// Run this to test the migration without actually doing it
function dryRun() {
  console.log('🧪 DRY RUN - Testing migration without making changes...');
  
  try {
    const sourceData = getSourceData();
    console.log(`📊 Would migrate ${sourceData.rows.length} rows`);
    
    const transformedData = transformData(sourceData);
    console.log(`🔄 Would transform into ${transformedData.length} rows`);
    
    console.log('\n📋 Sample transformed row:');
    if (transformedData.length > 0) {
      console.log(transformedData[0]);
    }
    
    console.log('\n✅ Dry run completed successfully!');
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
  }
} 