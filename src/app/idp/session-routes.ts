import * as Boom from 'boom';
import * as Joi from 'joi';
import * as Status from 'http-status';
import { format } from 'url';
import { get } from 'lodash';
import { hashAny } from '../primitive/hash';
import { IdpBinding } from './idp-binding';
import { secret } from '../app-const';
import {
  Db,
  SamlResponse,
  } from '../common-types';

export function makeSessionRoutes(db: Db, idpb: IdpBinding) {
  const { idp, spConfig } = idpb;
  return [
    {
      method: 'GET',
      path: '/login',
      options: {
        plugins: {
          'hapi-auth-cookie': { redirectTo: false }
        },
        auth: false,
        handler(request, h) {
          if (!get(request, 'query.samlReqId') && request.auth.isAuthenticated) {
            return h.redirect('/resource');
          }
          return h.view('idp-login.ejs');
        }
      }
    },
    {
      method: 'POST',
      // if any path tokens are added here, apparently hapi will add them to
      // the cookie path making cookies only valid for sybling routes
      path: '/session',
      options: {
        auth: false,
        tags: ['api', 'session'],
        async handler(request, h) {
          const { username, password, samlReqId } = request.payload;
          const user = db.users.findOne(u => u.email === username);

          if (user && hashAny(password) === user.hashword) {
            request.cookieAuth.set({ id: user.uuid });

            if (samlReqId) {
              const samlResp = await idp.produceSuccessResponse(spConfig, samlReqId, user.uuid, {});
              db.sessionStorage.set(user.uuid, samlResp);
              return h.redirect('/saml-bounce');
            }
            return h.redirect('/resource');
          } else {
            return Boom.unauthorized();
          }
        },
        validate: {
          payload: Joi.object({
            username: Joi.string().email().example('name1@email.tld'),
            password: Joi.string().example('password1'),
            samlReqId: Joi.string().optional()
          })
        }
      }
    },
    {
      method: 'DELETE',
      path: '/session',
      options: {
        tags: ['api', 'session'],
        handler(request, h) {
          request.cookieAuth.clear();
          return h.response(Status['202_MESSAGE']).code(202);
        }
      }
    },
    {
      method: 'GET',
      path: '/resource',
      options: {
        async handler(request, h: any) {
          const resp: SamlResponse = await idp.produceSuccessResponse(
            idpb.spConfig,
            secret,
            request.state['idp-sid'].id,
            {});

          return h.view('idp-resource.ejs', {
            SAMLResponse: resp.formBody.SAMLResponse,
            url: format(resp.url)
          });
        }
      }
    },
    {
      method: 'GET',
      path: '/saml-bounce',
      options: {
        handler(request, h: any) {
          const resp: SamlResponse = db.sessionStorage.get(request.state['idp-sid'].id);

          if (resp) {
            return h.view('idp-saml-bounce.ejs', {
              SAMLResponse: resp.formBody.SAMLResponse,
              url: format(resp.url)
            });
          } else {
            request.cookieAuth.clear();
            return h.redirect('/login');
          }
        }
      }
    }
  ];
}
