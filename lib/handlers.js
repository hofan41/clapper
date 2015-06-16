'use strict';

var Boom = require('boom');

exports.onPreHandler = function(request, reply) {
    if (request.server.methods.doesUserHaveAccess(request)) {
        reply.continue();
    } else {
        reply(Boom.unauthorized('You are not authorized to perform this action!'));
    }
};

exports.onPreResponse = function(request, reply) {
    // Leave API responses alone
    if (request.route.settings.app.isAPI) {
        return reply.continue();
    }

    var response = request.response;

    var context = {};

    if (response.isBoom) {
        var error = response;

        context = {
            supportedProviders: this.supportedProviders,
            error: error.output.payload.error,
            message: error.output.payload.message,
            code: error.output.statusCode
        };

        if (request.auth.isAuthenticated) {
            context.profile = request.auth.credentials.profile;
        }

        context.accessRights = request.server.methods.getUserAccessRights(request);

        return reply.view('error', context).code(error.output.statusCode);
    }

    if (response.variety === 'view') {
        context = response.source.context || {};

        if (request.auth.isAuthenticated) {
            context.profile = request.auth.credentials.profile;
        }

        context.accessRights = request.server.methods.getUserAccessRights(request);

        context.supportedProviders = this.supportedProviders;
    }

    return reply.continue();
};

exports.logOut = function(request, reply) {
    request.auth.session.clear();
    reply.redirect(request.info.referrer);
};