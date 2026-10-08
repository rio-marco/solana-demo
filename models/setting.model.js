'use strict';

const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        value: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

SettingSchema.statics.getVal = async function (key, defaultValue = null) {
    const doc = await this.findOne({ key });
    return doc ? doc.value : defaultValue;
};

SettingSchema.statics.setVal = async function (key, value, description = '') {
    return await this.findOneAndUpdate(
        { key },
        { value, description },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
};

module.exports = mongoose.model('Setting', SettingSchema);
