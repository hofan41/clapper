'use strict';

var Joi = require('joi');
var Hoek = require('hoek');
var JoiSchemas = require('./joiSchemas');
var PluginAttributes = require('./').register.attributes;

module.exports = [{
    name: 'getUserAccessRights',
    method: function(request) {
        if (request.auth.isAuthenticated === true) {
            return request.auth.credentials.userAccessRights;
        }

        return this.defaultRights.anonymous;
    }
}, {
    name: 'updateUserAccessRights',
    method: function(request, accessRights) {
        var result = Joi.validate(accessRights, JoiSchemas.accessConfig);
        Hoek.assert(!result.error, 'Failed Joi validation: ' + result.error);
        Hoek.assert(request.auth.isAuthenticated === true,
            'Should not be updating access rights for anonymous!');
        var currentAccessRights = {};

        // Initialize session variable if it doesn't exist.
        if (!request.auth.credentials.hasOwnProperty('userAccessRights')) {
            request.auth.session.set('userAccessRights', {});
        } else {
            currentAccessRights = Hoek.clone(request.auth.credentials.userAccessRights);
        }

        Object.keys(result.value).forEach(function(accessRight) {
            // If the new access right grants us new rights
            if (result.value[accessRight] === true) {
                currentAccessRights[accessRight] = true;
            }

            // If the new access right is not defined in the current object
            else if (!currentAccessRights.hasOwnProperty(accessRight)) {
                currentAccessRights[accessRight] = false;
            }
        });

        // Update session variable.
        request.auth.session.set('userAccessRights', currentAccessRights);
    }
}, {
    name: 'doesUserHaveAccess',
    method: function(request) {

        // Check if route is configured with an access schema
        if (request.route.settings.plugins.hasOwnProperty(PluginAttributes.name)) {
            var result = Joi.validate(request.route.settings.plugins[PluginAttributes.name], JoiSchemas.accessConfig);
            Hoek.assert(!result.error, 'Failed Joi validation: ' + result.error);

            var requiredAccess = result.value;

            // Retrieve the current user's access rights
            var currentAccessRights = request.server.methods.getUserAccessRights(request);

            // Compare with the requiredAccess
            for (var accessRight in requiredAccess) {

                // Ensure they are direct properties and not inherited properties
                if (requiredAccess.hasOwnProperty(accessRight)) {

                    if (requiredAccess[accessRight] === true) {

                        // If a required access right does not exist in the user's current rights, reject
                        if (!currentAccessRights.hasOwnProperty(accessRight)) {
                            return false;
                        }

                        // Or if a required access right has not been granted to the user, reject
                        else if (!currentAccessRights[accessRight]) {
                            return false;
                        }
                    }

                }
            }
        }

        // If we haven't rejected the user at this point, it has passed
        return true;
    }
}];