'use strict';

var Joi = require('joi');

exports.pluginDefaultConfig = {
    cookie: {}
};

exports.accessConfig = Joi.object().pattern(/.+/, Joi.boolean());

exports.accessRightsConfig = Joi.object({
    anonymous: exports.accessConfig.required(),
    authenticated: exports.accessConfig.required()
});

exports.pluginConfig = Joi.object({
    defaultRights: exports.accessRightsConfig.required(),
    cookie: Joi.object().unknown(true),
    logins: Joi.array().items(Joi.object({
        displayName: Joi.string().required(),
        routeName: Joi.string().required(),
        bellProvider: Joi.object().and('clientId', 'clientSecret').required(),
        plugins: Joi.array().items(Joi.object().keys({
            register: Joi.any(),
            options: Joi.any()
        }), Joi.string()),
        additionalRights: exports.accessConfig
    }))
});