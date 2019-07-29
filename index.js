var rp = require('request-promise-native');
var genieURI = 'https://genie.exosite.com/api/portals/v1/';
var genieRPC_URI = 'https://genie.m2.exosite.com/onep:v1/rpc/process';
var genieRPC_Auth;
var genieRPC_Header;
var genieAppHeader = {
  'AppVersion': '3.0.0',
  'BundleName': 'com.geniecompany.AladdinConnect',
  'User-Agent': 'Aladdin Connect iOS v3.0.0',
  'BuildVersion': '131',
}
var genieTokenHeader;
var userId;
var portalId;
var portalDetails;

function getDoorState(statusNumber) {
  switch(statusNumber) {
    case 1: //Open
      return 'OPEN';
    case 2: // Opening
    case 3: // Timeout Opening
      return 'OPENING';
    case 4: // Closed
      return 'CLOSED';
    case 5: // Closing
    case 6: // Timeout Closing
      return 'CLOSING'
    case 0: // Unknown
    case 7: // Not Configured
    default: // Unknown
      return 'STOPPED'
  }
}

module.exports = function(user, password, action, callback, deviceNumber = 0, doorNumber = 1) {
  // 1: get loginToken
  rp({
    method: 'GET',
    uri: genieURI + 'users/_this/token',
    headers: Object.assign({}, genieAppHeader, {
      'Authorization': 'Basic '+ Buffer.from(user + ':' + password).toString('base64'),
    }),
    json: true,
  }).then(function (response) {
    var loginToken = response;
    genieTokenHeader = Object.assign({}, genieAppHeader, { 'Authorization': 'Token: ' + loginToken });
    // 2: get userID
    rp({ method: 'GET', uri: genieURI + 'users/_this', headers: genieTokenHeader, json: true, })
    .then(function(response) {
      userId = response.id;
      // 3: get portalId
      rp({ method: 'GET', uri: genieURI + 'users/' + userId + '/portals', headers: genieTokenHeader, json: true, })
      .then(function(response) {
        portalId = response[0].PortalID;
        // 4: get portalDetails
        rp({ method: 'GET', uri: genieURI + 'portals/' + portalId, headers: genieTokenHeader, json: true })
        .then(function(response) {
          portalDetails = response;
          genieRPC_Auth = {
            cik: portalDetails.info.key,
            client_id: portalDetails.devices[deviceNumber]
          }
          genieRPC_Header = Object.assign({}, genieAppHeader, {
            'Authorization': 'Token: ' + loginToken,
            'Content-Type': 'application/json',
          });
          switch(action) {
            case 'open':
              rp({
                method: 'POST',
                uri: genieRPC_URI,
                headers: genieRPC_Header,
                body: {
                  auth: genieRPC_Auth,
                  calls: [
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.desired_status' }, 1 ],
                      id: 1,
                      procedure: 'write'
                    },
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.desired_status_user' }, user ],
                      id: 1,
                      procedure: 'write'
                    },
                  ]
                },
                json: true,
              })
              .then(function(response) { return callback('OPENING'); })
              .catch(function(error) { return callback('STOPPED'); });
              break;
            case 'close':
              rp({
                method: 'POST',
                uri: genieRPC_URI,
                headers: genieRPC_Header,
                body: {
                  auth: genieRPC_Auth,
                  calls: [
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.desired_status' }, 0 ],
                      id: 1,
                      procedure: 'write'
                    },
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.desired_status_user' }, user ],
                      id: 1,
                      procedure: 'write'
                    },
                  ]
                },
                json: true,
              })
              .then(function(response) { return callback(response.error?'STOPPED':'CLOSING'); })
              .catch(function(error) { return callback('STOPPED') });
              break;
            case 'status':
            default:
              rp({
                method: 'POST',
                uri: genieRPC_URI,
                headers: Object.assign({}, genieAppHeader, {
                  'Authorization': 'Token: ' + loginToken,
                  'Content-Type': 'application/json',
                }),
                body: {
                  auth: genieRPC_Auth,
                  calls: [
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.door_status' }, {} ],
                      id: 1,
                      procedure: 'read'
                    },
                  ]
                },
                json: true,
              })
              .then(function(response) { callback(getDoorState(response.error?'STOPPED':response[0].result[0][1])); })
              .catch(function(error) { console.log(error); });
            }
        });
      });
    });
  }).catch(function(error) {
    console.log(error);
  });
};
