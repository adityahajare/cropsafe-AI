const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Farmer = require('./models/Farmer');
const Farm = require('./models/Farm.model');
const Admin = require('./models/Admin');
const Claim = require('./models/Claim');

async function testDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri =
      process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crop_insurance';

    if (!mongoUri || typeof mongoUri !== 'string') {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI (preferred).');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected Successfully');

    // Test collections
    console.log('\n📊 Checking Collections:');
    
    const farmerCount = await Farmer.countDocuments();
    console.log(`👨‍🌾 Farmers: ${farmerCount}`);
    
    const farmCount = await Farm.countDocuments();
    console.log(`🚜 Farms: ${farmCount}`);
    
    const adminCount = await Admin.countDocuments();
    console.log(`👨‍💼 Admins: ${adminCount}`);
    
    const claimCount = await Claim.countDocuments();
    console.log(`📋 Claims: ${claimCount}`);

    // Create test admin if none exists
    if (adminCount === 0) {
      console.log('\n🔧 Creating test admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('smartcrop2024', 10);
      
      const admin = new Admin({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@smartcrop.com'
      });
      
      await admin.save();
      console.log('✅ Test admin created (username: admin, password: smartcrop2024)');
    }

    // Create test farm if none exists
    if (farmCount === 0) {
      console.log('\n🌾 Creating test farm...');
      const testFarm = new Farm({
        farmerId: 'test123',
        farmerName: 'Test Farmer',
        mobile: '9876543210',
        centerCoordinates: {
          latitude: 18.52,
          longitude: 73.85
        },
        boundary: [
          [18.52, 73.85],
          [18.521, 73.851],
          [18.519, 73.852],
          [18.518, 73.849]
        ],
        area: 2.5,
        crop: 'Rice',
        season: 'Kharif',
        landSize: 2.5
      });
      
      await testFarm.save();
      console.log('✅ Test farm created');
    }

    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testDatabase();
