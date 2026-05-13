/**
 * Test Script: Register 10 Farmers from Different Regions of India
 * Generates satellite analysis and PDF reports for each
 * Date: April 27, 2026
 */

const axios = require("axios");

const API_BASE = "http://localhost:5001/api";

// 10 Test Farmers from Different Regions
const farmers = [
  {
    id: "FARMER_PUNJAB_001",
    name: "Harpreet Singh",
    mobile: "9876543210",
    aadhaar: "111111111111",
    city: "Ludhiana",
    state: "Punjab",
    lat: 30.9010,
    lon: 75.8573,
    crop: "Wheat",
    season: "Rabi",
    landSize: 5.0,
    boundary: [
      [30.9005, 75.8568],
      [30.9005, 75.8578],
      [30.9015, 75.8578],
      [30.9015, 75.8568],
      [30.9005, 75.8568]
    ]
  },
  {
    id: "FARMER_HARYANA_001",
    name: "Rajesh Kumar",
    mobile: "9876543211",
    aadhaar: "111111111112",
    city: "Hisar",
    state: "Haryana",
    lat: 29.1724,
    lon: 75.7339,
    crop: "Sugarcane",
    season: "Kharif",
    landSize: 3.5,
    boundary: [
      [29.1719, 75.7334],
      [29.1719, 75.7344],
      [29.1729, 75.7344],
      [29.1729, 75.7334],
      [29.1719, 75.7334]
    ]
  },
  {
    id: "FARMER_UP_001",
    name: "Amit Verma",
    mobile: "9876543212",
    aadhaar: "111111111113",
    city: "Lucknow",
    state: "Uttar Pradesh",
    lat: 26.8467,
    lon: 80.9462,
    crop: "Rice",
    season: "Kharif",
    landSize: 4.0,
    boundary: [
      [26.8462, 80.9457],
      [26.8462, 80.9467],
      [26.8472, 80.9467],
      [26.8472, 80.9457],
      [26.8462, 80.9457]
    ]
  },
  {
    id: "FARMER_GUJARAT_001",
    name: "Vikram Patel",
    mobile: "9876543213",
    aadhaar: "111111111114",
    city: "Ahmedabad",
    state: "Gujarat",
    lat: 23.0225,
    lon: 72.5714,
    crop: "Cotton",
    season: "Kharif",
    landSize: 6.0,
    boundary: [
      [23.0220, 72.5709],
      [23.0220, 72.5719],
      [23.0230, 72.5719],
      [23.0230, 72.5709],
      [23.0220, 72.5709]
    ]
  },
  {
    id: "FARMER_MAHARASHTRA_001",
    name: "Finix Kirana Store",
    mobile: "9876543214",
    aadhaar: "111111111115",
    city: "Malgaon",
    state: "Maharashtra",
    lat: 18.4200,
    lon: 77.5300,
    crop: "Sugarcane",
    season: "Kharif",
    landSize: 2.5,
    boundary: [
      [18.4195, 77.5295],
      [18.4195, 77.5305],
      [18.4205, 77.5305],
      [18.4205, 77.5295],
      [18.4195, 77.5295]
    ]
  },
  {
    id: "FARMER_KARNATAKA_001",
    name: "Suresh Reddy",
    mobile: "9876543215",
    aadhaar: "111111111116",
    city: "Bangalore",
    state: "Karnataka",
    lat: 12.9716,
    lon: 77.5946,
    crop: "Coffee",
    season: "Kharif",
    landSize: 3.0,
    boundary: [
      [12.9711, 77.5941],
      [12.9711, 77.5951],
      [12.9721, 77.5951],
      [12.9721, 77.5941],
      [12.9711, 77.5941]
    ]
  },
  {
    id: "FARMER_TAMILNADU_001",
    name: "Ramakrishnan",
    mobile: "9876543216",
    aadhaar: "111111111117",
    city: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0827,
    lon: 80.2707,
    crop: "Rice",
    season: "Kharif",
    landSize: 4.5,
    boundary: [
      [13.0822, 80.2702],
      [13.0822, 80.2712],
      [13.0832, 80.2712],
      [13.0832, 80.2702],
      [13.0822, 80.2702]
    ]
  },
  {
    id: "FARMER_TELANGANA_001",
    name: "Srinivas Rao",
    mobile: "9876543217",
    aadhaar: "111111111118",
    city: "Hyderabad",
    state: "Telangana",
    lat: 17.3850,
    lon: 78.4867,
    crop: "Maize",
    season: "Kharif",
    landSize: 3.5,
    boundary: [
      [17.3845, 78.4862],
      [17.3845, 78.4872],
      [17.3855, 78.4872],
      [17.3855, 78.4862],
      [17.3845, 78.4862]
    ]
  },
  {
    id: "FARMER_WESTBENGAL_001",
    name: "Debashis Dey",
    mobile: "9876543218",
    aadhaar: "111111111119",
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lon: 88.3639,
    crop: "Jute",
    season: "Kharif",
    landSize: 2.0,
    boundary: [
      [22.5721, 88.3634],
      [22.5721, 88.3644],
      [22.5731, 88.3644],
      [22.5731, 88.3634],
      [22.5721, 88.3634]
    ]
  },
  {
    id: "FARMER_MP_001",
    name: "Mohan Sharma",
    mobile: "9876543219",
    aadhaar: "111111111120",
    city: "Indore",
    state: "Madhya Pradesh",
    lat: 22.7196,
    lon: 75.8577,
    crop: "Soybean",
    season: "Kharif",
    landSize: 5.5,
    boundary: [
      [22.7191, 75.8572],
      [22.7191, 75.8582],
      [22.7201, 75.8582],
      [22.7201, 75.8572],
      [22.7191, 75.8572]
    ]
  }
];

// Register a single farmer
async function registerFarmer(farmer) {
  try {
    console.log(`\n📍 Registering: ${farmer.name} (${farmer.state})`);
    
    const response = await axios.post(`${API_BASE}/farms/boundary`, {
      farmerId: farmer.mobile,
      farmerName: farmer.name,
      mobile: farmer.mobile,
      centerCoordinates: {
        latitude: farmer.lat,
        longitude: farmer.lon
      },
      boundary: farmer.boundary,
      crop: farmer.crop,
      season: farmer.season,
      landSize: farmer.landSize
    });
    
    console.log(`✅ Registered: ${farmer.name}`);
    console.log(`   Farm ID: ${farmer.mobile}`);
    console.log(`   Location: ${farmer.city}, ${farmer.state}`);
    console.log(`   Crop: ${farmer.crop}`);
    console.log(`   Area: ${farmer.landSize} acres`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error registering ${farmer.name}:`, error.message);
    return null;
  }
}

// Get satellite analysis for a farmer
async function getSatelliteAnalysis(farmerId) {
  try {
    console.log(`   🛰️ Fetching satellite analysis...`);
    
    const response = await axios.post(`${API_BASE}/satellite/analyze-boundary`, {
      farmerId: farmerId
    });
    
    const data = response.data;
    console.log(`   ✅ Satellite analysis complete`);
    console.log(`      NDVI: ${data.statistics?.current?.mean?.toFixed(3) || 'N/A'}`);
    console.log(`      Risk: ${data.aiRiskEngine?.riskLevel || 'N/A'}`);
    console.log(`      Damage: ${data.statistics?.change?.damagePercent || 0}%`);
    
    return data;
  } catch (error) {
    console.error(`   ❌ Error fetching satellite analysis:`, error.message);
    return null;
  }
}

// Generate PDF report
async function generatePDFReport(farmerId, farmerName) {
  try {
    console.log(`   📄 Generating PDF report...`);
    
    const response = await axios.post(`${API_BASE}/report/generate`, {
      farmerId: farmerId,
      farmerName: farmerName
    });
    
    console.log(`   ✅ PDF report generated`);
    console.log(`      Report ID: ${response.data.reportId || 'N/A'}`);
    
    return response.data;
  } catch (error) {
    console.error(`   ❌ Error generating PDF:`, error.message);
    return null;
  }
}

// Main execution
async function runTests() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  🌾 TESTING 10 FARMERS FROM DIFFERENT REGIONS OF INDIA   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  console.log("\n📊 TEST FARMERS:");
  farmers.forEach((f, i) => {
    console.log(`${i + 1}. ${f.name} - ${f.state} (${f.crop})`);
  });
  
  const results = [];
  
  // Register all farmers
  console.log("\n\n🔄 PHASE 1: REGISTERING FARMERS");
  console.log("═".repeat(60));
  
  for (const farmer of farmers) {
    const registered = await registerFarmer(farmer);
    if (registered) {
      results.push({
        farmer: farmer,
        registered: true,
        analysis: null,
        report: null
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  // Get satellite analysis
  console.log("\n\n🛰️ PHASE 2: SATELLITE ANALYSIS");
  console.log("═".repeat(60));
  
  for (let i = 0; i < results.length; i++) {
    if (results[i].registered) {
      console.log(`\n[${i + 1}/${results.length}] ${results[i].farmer.name}`);
      const analysis = await getSatelliteAnalysis(results[i].farmer.mobile);
      results[i].analysis = analysis;
    }
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }
  
  // Generate PDF reports
  console.log("\n\n📄 PHASE 3: PDF REPORT GENERATION");
  console.log("═".repeat(60));
  
  for (let i = 0; i < results.length; i++) {
    if (results[i].analysis) {
      console.log(`\n[${i + 1}/${results.length}] ${results[i].farmer.name}`);
      const report = await generatePDFReport(
        results[i].farmer.mobile,
        results[i].farmer.name
      );
      results[i].report = report;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  // Summary
  console.log("\n\n📊 TEST SUMMARY");
  console.log("═".repeat(60));
  
  let registered = 0;
  let analyzed = 0;
  let reported = 0;
  
  results.forEach((r, i) => {
    if (r.registered) registered++;
    if (r.analysis) analyzed++;
    if (r.report) reported++;
    
    const status = r.report ? "✅" : r.analysis ? "⚠️" : r.registered ? "⏳" : "❌";
    console.log(`${status} ${i + 1}. ${r.farmer.name} (${r.farmer.state})`);
  });
  
  console.log("\n📈 RESULTS:");
  console.log(`   Registered: ${registered}/${farmers.length}`);
  console.log(`   Analyzed: ${analyzed}/${farmers.length}`);
  console.log(`   Reports: ${reported}/${farmers.length}`);
  
  console.log("\n✨ NEXT STEPS:");
  console.log("   1. Go to http://localhost:8080/admin");
  console.log("   2. Login with admin credentials");
  console.log("   3. Review all 10 pending claims");
  console.log("   4. Accept 6 claims");
  console.log("   5. Reject 4 claims");
  
  console.log("\n🎉 TEST COMPLETE!");
}

// Run the tests
runTests().catch(console.error);
