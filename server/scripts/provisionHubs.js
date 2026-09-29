require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const College = require('../models/College');
const User = require('../models/User');
const { seedColleges, ensureHubForCollege } = require('../services/hubProvisioning');
async function provisionHubs() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    await User.init();
    await seedColleges();
    const active = await College.find({ status: 'active' });
    for (const college of active) await ensureHubForCollege(college._id);
    console.log(JSON.stringify({ configuredColleges: await College.countDocuments({}), activeColleges: active.length }));
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) provisionHubs().catch(() => { console.error('Hub provisioning failed. Check registry confirmation, indexes, and a transaction-capable database.'); process.exitCode = 1; });
module.exports = { provisionHubs };
