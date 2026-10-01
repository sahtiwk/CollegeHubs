/**
 * seedAdmin.js — Create the admin user in MongoDB
 *
 * Run once: node backend/src/scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User.model');

const ADMIN = {
  name:     'Aftab Admin',
  email:    'aftab@admin.com',
  password: 'passwore123',
  role:     'super_admin',   // Super Admin — full platform access
};

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN.email });

    if (existing) {
      // Update role to admin and reset password
      existing.role     = 'admin';
      existing.password = ADMIN.password; // pre-save hook will hash it
      existing.isActive = true;
      await existing.save();
      console.log(`✅ Admin user updated: ${ADMIN.email}`);
    } else {
      await User.create(ADMIN);
      console.log(`✅ Admin user created: ${ADMIN.email}`);
    }

    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email:    ${ADMIN.email}`);
    console.log(`   Password: ${ADMIN.password}`);
    console.log(`   Role:     admin\n`);

  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
