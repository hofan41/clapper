'use strict';

var Hoek = require('hoek');
var Joi = require('joi');
var Promise = require('promise');
var Handlers = require('./handlers');
var JoiSchemas = require('./joiSchemas');

var internals = {};

exports.register = function(server, options, next) {

    var result = Joi.validate(Hoek.applyToDefaults(JoiSchemas.pluginDefaultConfig, options), JoiSchemas.pluginConfig);

    Hoek.assert(!result.error, 'Failed Joi validation: ' + result.error);

    var settings = result.value;

    server.register([
            require('hapi-require-https'),
            require('bell'),
            require('hapi-auth-cookie')
        ],
        function(err) {
            Hoek.assert(!err, 'Failed loading plugin: ' + err);
            server.auth.strategy('session', 'cookie', 'optional', settings.cookie);
        });

    internals.supportedProviders = [];

    server.bind({
        defaultRights: settings.defaultRights,
        supportedProviders: internals.supportedProviders
    });

    server.method(require('./methods'));

    server.route({
        method: 'GET',
        path: '/logout',
        handler: Handlers.logOut
    });

    server.ext('onPreHandler', Handlers.onPreHandler);

    server.ext('onPreResponse', Handlers.onPreResponse);

    // Set up third party login systems using bell.
    settings.logins.forEach(function(login) {
        internals.registerProvider(server, login);
    });

    next();
};

internals.registerProvider = function(server, login) {

    if (login.bellProvider.clientId) {
        internals.supportedProviders.push(login);

        server.auth.strategy(login.routeName, 'bell', login.bellProvider);

        // Register any additional plugins
        if (login.plugins) {
            server.register(login.plugins, function(err) {
                Hoek.assert(!err, 'Failed loading plugin: ' + err);
            });
        }

        server.route({
            method: ['GET', 'POST'],
            path: '/auth/' + login.routeName,
            config: {
                auth: login.routeName,
                handler: function(request, reply) {

                    server.log(['clapper', 'login'], 'Redirected from OAuth Provider');
                    if (request.auth.isAuthenticated) {
                        server.log(['clapper', 'login'], 'Successfully authenticated');
                        var loginSuccessCallbacks = [];

                        server.log(['clapper', 'login'], 'Set session cookie to ' + JSON.stringify(request.auth.credentials));
                        request.auth.session.set(request.auth.credentials);

                        var accessRights = Hoek.applyToDefaults(this.defaultRights.authenticated, login.additionalRights || {});

                        server.methods.updateUserAccessRights(request, accessRights);

                        if (login.plugins) {
                            login.plugins.forEach(function(plugin) {

                                var pluginName = plugin.register.attributes.name;

                                if (server.plugins.hasOwnProperty(pluginName) &&
                                    server.plugins[pluginName].hasOwnProperty('onLoginSuccess')) {

                                    // Call the plugin login success handler
                                    loginSuccessCallbacks.push(server.plugins[pluginName].onLoginSuccess(request));
                                }
                            });
                        }

                        // Wait for all of the login success callbacks to finish
                        Promise.all(loginSuccessCallbacks).then(function() {

                            server.log(['clapper', 'login'], 'Redirecting to index page');
                            reply.redirect('/.');
                        });
                    } else {

                        server.log(['clapper', 'login'], 'Failed to authenticate');
                        return reply('Authentication failed due to: ' + request.auth.error.message);
                    }
                }
            }
        });
    }
};

exports.register.attributes = {
    pkg: require('../package.json')
};