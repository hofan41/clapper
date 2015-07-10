// For twitter localhost test, use http://127.0.0.1/ 
// as the callback url in twitter app settings
var TWITTER_APP_ID = 'INSERT HERE';
var TWITTER_APP_SECRET = 'INSERT HERE';

var FACEBOOK_APP_ID = 'INSERT HERE';
var FACEBOOK_APP_SECRET = 'INSERT HERE';

var Hapi = require('hapi');
var server = new Hapi.Server();

server.connection({
  port: 8080
});

// Register clapper with the server.
// This example adds facebook as one of the login providers.
server.register({
    register: require('../'),
    options: { // plugin options are mandatory
      defaultRights: {
        anonymous: {
          canHazCheezburger: false
        },
        authenticated: {
          canHazCheezburger: true
        }
      },
      cookie: { // hapi-auth-cookie strategy options here
        password: 'TESTING',
        isSecure: false
      },
      logins: [{
        displayName: 'Facebook',
        routeName: 'facebook', // clapper will create a route at '/auth/facebook'
        bellProvider: { // related bell strategy options here
          provider: 'facebook',
          password: 'TESTING',
          clientId: FACEBOOK_APP_ID,
          clientSecret: FACEBOOK_APP_SECRET,
          isSecure: false,
          forceHttps: false
        }
      }, {
        displayName: 'Twitter',
        routeName: 'twitter', // clapper will create a route at '/auth/twitter'
        bellProvider: { // related bell strategy options here
          provider: 'twitter',
          password: 'TESTING',
          clientId: TWITTER_APP_ID,
          clientSecret: TWITTER_APP_SECRET,
          isSecure: false,
          forceHttps: false
        }
      }]
    }
  },
  function(err) {

    // Declare a route that requires the user to have the 'canHazCheezburger' right.
    // If the user does not have the right, they will be redirected to the error view.
    // If the user does have the right, the route handler function will be executed.
    server.route({
      path: '/',
      method: 'GET',
      config: {
        plugins: {
          clapper: {
            canHazCheezburger: true
          }
        }
      },
      handler: function(request, reply) {

        return reply('I can haz cheezburger!');
      }
    });

    // Start the server.
    // To test, please access:
    // 1. http://localhost:8080/              - confirm error page.
    // 2. http://localhost:8080/auth/facebook - login.
    // 3. http://localhost:8080/              - confirm cheezburger.
    server.start();
  });