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
            method: 'GET',
            path: '/auth/' + login.routeName,
            config: {
                auth: login.routeName,
                handler: function(request, reply) {

                    if (request.auth.isAuthenticated) {
                        var loginSuccessCallbacks = [];

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

                            reply.redirect('/.');
                        });
                    }
                }
            }
        });
    }
};

exports.register.attributes = {
    pkg: require('../package.json')
};