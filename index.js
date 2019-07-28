const rp = require('request-promise-native');
const genieURI = 'https://genie.exosite.com/api/portals/v1/';
const genieRPC_URI = 'https://genie.m2.exosite.com/onep:v1/rpc/process';
const genieAppHeader = {
    'AppVersion': '3.0.0',
    'BundleName': 'com.geniecompany.AladdinConnect',
    'User-Agent': 'Aladdin Connect iOS v3.0.0',
    'BuildVersion': '131',
}

const DEBUG = 1;

function debug(info, obj) {
  if (DEBUG) {
    console.log('[*] DEBUG: ' + info + ': ' + JSON.stringify(obj));
  }
}

function getDoorState(statusNumber) {
  switch(statusNumber) {
    case 0: // Unknown
      return 'STOPPED';
    case 1: //Open
      return 'OPEN';
    case 2: // Opening
    case 3: // Timeout Opening
      return 'OPENING';
    case 4: // Closed
      return 'CLOSED';
    case 5: // Closing
    case 6: // Timeout Closing
      return 'CLOSING,'
    case 7: // Not Configured
    default: // Error
      return 'STOPPED'
  }
}

async function openClose(shouldOpen, genieRPC_URI,genieRPC_Header,genieRPC_Auth,doorNumber, callback) {
   try {
    await rp({
                method: 'POST',
                uri: genieRPC_URI,
                headers: genieRPC_Header,
                body: {
                  auth: genieRPC_Auth,
                  calls: [
                    {
                      arguments: [ { alias: 'dps' + doorNumber + '.desired_status' }, shouldOpen ],
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
              });
      return callback(shouldOpen?'OPEENING':'CLOSING');
    } catch (error) {
      return callback('STOPPED'); 
    }
}

async function getStatus(genieRPC_URI,genieRPC_Header,genieRPC_Auth,doorNumber, callback) {
  try {
    let response = await rp({
      method: 'POST',
      uri: genieRPC_URI,
      headers: genieRPC_Header,
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
    });
    
    debug('door_status response', response);

    callback(getDoorState(response ? response[0].result[0][1] : -1 )); 

  } catch (error) {
    console.log(error); 
  }
}

module.exports = async (user, password, action, callback, deviceNumber = 0, doorNumber = 1) => {
  var genieRPC_Auth;
  var genieRPC_Header;
  var genieTokenHeader;
  var userId;
  var portalId;
  var portalDetails;
  
  // 1: get loginToken
  let loginToken = await rp({
    method: 'GET',
    uri: genieURI + 'users/_this/token',
    headers: Object.assign({}, genieAppHeader, {
      'Authorization': 'Basic '+ Buffer.from(user + ':' + password).toString('base64'),
    }),
    json: true,
  });
  
  debug('Token',loginToken);
  
  let genieTokenHeader = Object.assign({}, genieAppHeader, { 'Authorization': 'Token: ' + loginToken });
  
  // 2: get userID
  let responseUser = await rp({ 
    method: 'GET', 
    uri: genieURI + 'users/_this', 
    headers: genieTokenHeader, 
    json: true, 
  });

  debug('users/_this',responseUser);
  
  let userId = responseUser.id;

  // 3: get portalId
  let portals = await rp({ 
    method: 'GET', 
    uri: genieURI + 'users/' + userId + '/portals', 
    headers: genieTokenHeader, 
    json: true, 
  });

  debug('Portals', portals);

  let portalId = portals[0].PortalID;
  
  // 4: get portalDetails
  let portalDetails = await rp({
    method: 'GET', 
    uri: genieURI + 'portals/' + portalId, 
    headers: genieTokenHeader, 
    json: true 
  });

  debug('Portals/'+portalId, portalDetails);
  
  // use info.key as a part of auth token
  let genieRPC_Auth = {
    cik: portalDetails.info.key,
    client_id: portalDetails.devices[deviceNumber]
  };

  debug('PortalDetails.Info',portalDetails.info);

  let genieRPC_Header = Object.assign({}, genieAppHeader, {
    'Authorization': 'Token: ' + loginToken,
    'Content-Type': 'application/json',
  });

  switch(action) {
    case 'open':
      await openClose(1, genieRPC_URI,genieRPC_Header,genieRPC_Auth,doorNumber, callback);
      break;
    case 'close':
      await openClose(0, genieRPC_URI,genieRPC_Header,genieRPC_Auth,doorNumber, callback);
      break;
    case 'status':
    default:
      await getStatus(genieRPC_URI,genieRPC_Header,genieRPC_Auth,doorNumber, callback);
  }
}

