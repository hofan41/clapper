![clapper Logo](https://raw.github.com/hofan41/clapper/master/images/clapper.png)

**clapper** is a third-party access control plugin for [hapi](https://github.com/hapijs/hapi). **clapper** uses and registers bell, hapi-auth-cookie, and hapi-require-https plugins. 

**clapper** is intended to be the only plugin you need to get simple OAuth authentication and access control working for your application.


Lead Maintainer: [Ho-Fan Kang](https://github.com/hofan41)

### Usage

**clapper** was designed to be fully functional via configuration.

**clapper** works by adding a global pre-handler on all incoming server requests. This handler function is used to determine whether or not 
the user can proceed so by examining their access rights and the route's access pre-requisites.

```javascript
var Hapi = require('hapi');
var server = new Hapi.Server();

server.connection({ port: 8000 });

// Register clapper with the server.
// This example adds facebook as one of the login providers.
server.register({ 
    register: require('clapper'),
    options: {                      // plugin options are mandatory
      defaultRights: {
        anonymous: { canHazCheezburger: false },
        authenticated: { canHazCheezburger: true }
      },
      cookie: {                     // hapi-auth-cookie strategy options here
        password: COOKIE_PASSWORD,
        isSecure: false
      },
      logins: [ {
          displayName: 'Facebook',
          routeName: 'facebook',    // clapper will create a route at '/auth/facebook'
          bellProvider: {           // related bell strategy options here
            provider: 'facebook',
            password: COOKIE_PASSWORD,
            clientId: FACEBOOK_APP_ID,
            clientSecret: FACEBOOK_APP_SECRET,
            isSecure: false,
            forceHttps: false
          }
      } ]
    }
  },
function (err) {

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
    handler: function (request, reply) {
      return reply('I can haz cheezburger!');
    }
  });

  // Start the server.
  // To test, please access:
  // 1. http://localhost:8000/              - confirm error page.
  // 2. http://localhost:8000/auth/facebook - login.
  // 3. http://localhost:8000/              - confirm cheezburger.
  server.start();
});
```

### Options

**clapper** requires the following plugin configuration options:
- `defaultRights` - an object containing the following:
    - `anonymous` - an object containing boolean properties representing an anonymous user's rights granted by default.
    - `authenticated` - an object containing boolean properties representing an authenticated user's rights granted by default.
- `cookie` - an object containing the [hapi-auth-cookie strategy options](https://github.com/hapijs/hapi-auth-cookie#hapi-auth-cookie) used by **clapper**
- `logins` - an array containing at least one instance of the object defined below:
    - `displayName` - a string representing the name of the authentication provider as displayed to the user
    - `routeName` - a unique string representing the name of the route to be created by **clapper** for authentication with the specified OAuth provider
    - `bellProvider` - an object containing the [bell authentication strategy options](https://github.com/hapijs/bell#options) used by **clapper**
    - `additionalRights` - **optional** an object containing boolean properties representing additional rights granted to any authenticated users using this specific authentication provider
    - `plugins` - **optional** an array of objects where each one is either:
        - a plugin registration function
        - an object with the following:
            - `register` - a hapi plugin registration function.
            - `options` - optional options passed to the registration function when called.
