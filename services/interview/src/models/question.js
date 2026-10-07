const { Schema } = require('mongoose');
module.exports = new Schema({ id: String, questionText: { type: String, maxlength: 1000 }, category: String, difficulty: String, expectedKeywords: [{ type: String, maxlength: 80 }] }, { _id: false, versionKey: false, strict: 'throw' });
