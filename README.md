# Saml2-Testing
Webapps and cli tools that demo saml2 integrations, built with @socialtables/saml-protocol, Hapi.js, Boostrap, and Typescript

## Environment
The code is written in Typescript targeting ES6 as the output format, it also uses generators so it probably can't go any lower than that. I was using node v11 during development and have not checked what the lowest compatible version is.

## Getting Started
- Install dependencies `npm install`
- Run the webapps and repl together `npm start`
- Run a webapp independently `npm run start:idp` or `npm run start:sp`

Identity provider listens on 8080, Service provider listens on 7001

### Common Endpoints
- `/documentation` - swagger-ui representation of the api
- `/login` - login page
- `/resource` - a page that requires authentication
