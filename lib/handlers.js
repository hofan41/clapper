'use strict';

var Boom = require('boom');

exports.onPreHandler = function(request, reply) {
    if (request.server.methods.doesUserHaveAccess(request)) {
        reply.continue();
    } else {
        reply(Boom.unauthorized('You are not authorized to perform this action!'));
    }
};

// Attach access rights and supported providers to all contexts
exports.onPreResponse = function(request, reply) {

    var response = request.response;

    // Can only attach to contexts if the response type is a view
    if (response.variety === 'view') {
        var context = response.source.context || {};

        context.accessRights = request.server.methods.getUserAccessRights(request);
        context.supportedProviders = request.server.methods.getSupportedProviders();

        if (request.auth.isAuthenticated) {
            context.profile = request.auth.credentials.profile;
        }
    }

    return reply.continue();
};

exports.logOut = function(request, reply) {
    request.auth.session.clear();
    reply.redirect(request.info.referrer);
};