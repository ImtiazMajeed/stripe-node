'use strict';

var https = require('https');
var utils = require('./utils');
var Error = require('./Error');

StripeResource.HOST = 'api.stripe.com';
StripeResource.PORT = '443';
StripeResource.BASE_PATH = '/v1/';
StripeResource.DEFAULT_API_VERSION = '2013-08-13';

/**
 * Provide extension mechanism for Stripe Resource Sub-Classes
 */
StripeResource.extend = utils.protoExtend;

/**
 * Expose method-creator
 */
StripeResource.method = require('./StripeMethod');

/**
 * Encapsulates request logic for a Stripe Resource
 */
function StripeResource(auth, version, urlData) {

  this._auth = auth;
  this._version = version;
  this._urlData = urlData || {};

  this.basePath = utils.makeInterpolator(this.basePath);
  this.path = utils.makeInterpolator(this.path);

  if (this.includeBasic) {
    this.includeBasic.forEach(function(methodName) {
      this[methodName] = StripeResource.BASIC_METHODS[methodName];
    }, this);
  }

  this.initialize.apply(this, arguments);

}

StripeResource.prototype = {

  basePath: StripeResource.BASE_PATH,
  apiVersion: StripeResource.API_VERSION,
  path: '',

  initialize: function() {},

  _request: function(method, path, data, callback) {

    var requestData = utils.stringifyRequestData(data || {});
    var self = this;

    var req = https.request({
      host: StripeResource.HOST,
      port: StripeResource.PORT,
      path: path,
      method: method,
      headers: {
        'Authorization': this._auth,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': requestData.length,
        'Stripe-Version': this._version || StripeResource.DEFAULT_API_VERSION
      }
    });

    req.on('response', function(res) {
      var response = '';

      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        response += chunk;
      });
      res.on('end', function() {
        try {
          response = JSON.parse(response);
          if (response.error) {
            return callback(
              Error.StripeError.generate(response.error),
              null
            );
          }
        } catch (e) {
          return callback(
            new Error('InvalidResponseError', 'Invalid JSON from stripe.com'),
            null
          );
        }
        callback(null, response);
      });
    });

    req.on('error', function(error) {
      callback(
        new Error('HTTPSError', error),
        null
      );
    });

    req.write(requestData);
    req.end();

  }

};

StripeResource.BASIC_METHODS = {

  create: StripeResource.method({
    method: 'POST'
  }),

  list: StripeResource.method({
    method: 'GET'
  }),

  retrieve: StripeResource.method({
    method: 'GET',
    path: '/{id}',
    urlParams: ['id']
  }),

  update: StripeResource.method({
    method: 'POST',
    path: '{id}',
    urlParams: ['id']
  }),

  // Avoid 'delete' keyword in JS
  del: StripeResource.method({
    method: 'DELETE',
    path: '{id}',
    urlParams: ['id']
  })

};

module.exports = StripeResource;