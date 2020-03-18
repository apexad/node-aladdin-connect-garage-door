'use strict'

const rp = require('request-promise-native');
const genieURI = 'https://genie.exosite.com/api/portals/v1/';
const genieRPC_URI = 'https://genie.m2.exosite.com/onep:v1/rpc/process';
const genieAppHeader = {
  'AppVersion': '3.0.0',
  'BundleName': 'com.geniecompany.AladdinConnect',
  'User-Agent': 'Aladdin Connect iOS v3.0.0',
  'BuildVersion': '131',
}

function debug(info, obj, allowDebug) {
  if (allowDebug) {
    console.log(`[*] DEBUG: ${info}: ${JSON.stringify(obj)}`);
  }
}

function doorStatusNumberToString(statusNumber) {
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
      return 'CLOSING';
    case 0: // Unknown
    case 7: // Not Configured
    default: // Error
      return 'STOPPED';
  }
}

async function openClose(shouldOpen, user, genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug) {
  let response = await rp({
    method: 'POST',
    uri: genieRPC_URI,
    headers: genieRPC_Header,
    body: {
      auth: genieRPC_Auth,
      calls: [
        {
          arguments: [ { alias: `dps${doorNumber}.desired_status` }, shouldOpen ],
          id: 1,
          procedure: 'write'
        },
        {
          arguments: [ { alias: `dps${doorNumber}.desired_status_user` }, user ],
          id: 2,
          procedure: 'write'
        },
      ]
    },
    json: true,
  });
  
  debug('desired_status response', response, allowDebug);
  
  if (response.error) {
    return 'STOPPED';
  }
  return shouldOpen ? 'OPENING' : 'CLOSING';
}

async function getStatus(genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug, includeBattery) {
  const calls = [
    {
      arguments: [ { alias: `dps${doorNumber}.door_status` }, {} ],
      id: 1,
      procedure: 'read'
    },
  ];

  if (includeBattery) {
    calls.push({
      arguments: [ { alias: `dps${doorNumber}.battery_level` }, {} ],
      id: 2,
      procedure: 'read'
    });

    calls.push({
      arguments: [ { alias: `dps${doorNumber}.link_status` }, {} ],
      id: 3,
      procedure: 'read'
    });
  }

  let response = await rp({
    method: 'POST',
    uri: genieRPC_URI,
    headers: genieRPC_Header,
    body: {
      auth: genieRPC_Auth,
      calls,
    },
    json: true,
  });
  
  debug(`door_status${includeBattery ? ', battery_level, and link_status' : ''} response`, response, allowDebug);
  
  if (response.error) {
    return 'STOPPED';
  }

  const doorStatus = doorStatusNumberToString(response[0].result[0][1]);
  const batteryPercent = includeBattery ? response[1].result[0][1] : 0;
  const linkStatus = includeBattery ? response[2].result[0][1] : 0;

  return `${doorStatus}${includeBattery ? `:${linkStatus === 3 ? batteryPercent : 0}` : ''}`;
}

async function getBattery(genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug) {
  let response = await rp({
    method: 'POST',
    uri: genieRPC_URI,
    headers: genieRPC_Header,
    body: {
      auth: genieRPC_Auth,
      calls: [
        {
          arguments: [ { alias: `dps${doorNumber}.battery_level` }, {} ],
          id: 1,
          procedure: 'read'
        },
        {
          arguments: [ { alias: `dps${doorNumber}.link_status` }, {} ],
          id: 2,
          procedure: 'read'
        },
      ]
    },
    json: true,
  });

  debug('battery_level and link_status response', response, allowDebug);

  if (response.error) {
    return 'STOPPED';
  }

  const batteryPercent = response[0].result[0][1];
  const linkStatus = response[1].result[0][1];

  return linkStatus === 3 ? batteryPercent : 0;
}

async function sendCommandToDoor(user, password, action, deviceNumber, doorNumber, allowDebug) {
  try {
    // 1: get loginToken
    let loginToken = await rp({
      method: 'GET',
      uri: `${genieURI}users/_this/token`,
      headers: Object.assign({}, genieAppHeader, {
        'Authorization': `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
      }),
      json: true,
    });
    
    debug('Token',loginToken, allowDebug);
    
    let genieTokenHeader = Object.assign({}, genieAppHeader, { 'Authorization': `Token: ${loginToken}` });
    
    // 2: get userID
    let responseUser = await rp({ 
      method: 'GET', 
      uri: `${genieURI}users/_this`,
      headers: genieTokenHeader, 
      json: true, 
    });
    
    debug('users/_this', responseUser, allowDebug);
    
    let userId = responseUser.id;
    
    // 3: get portalId
    let portals = await rp({ 
      method: 'GET', 
      uri: `${genieURI}users/${userId}/portals`,
      headers: genieTokenHeader, 
      json: true, 
    });
    
    debug('Portals', portals, allowDebug);
    
    let portalId = portals[0].PortalID;
    
    // 4: get portalDetails
    let portalDetails = await rp({
      method: 'GET', 
      uri: `${genieURI}portals/${portalId}`,
      headers: genieTokenHeader, 
      json: true 
    });
    
    debug(`Portals/${portalId}`, portalDetails, allowDebug);
    
    let genieRPC_Auth = {
      cik: portalDetails.info.key,
      client_id: portalDetails.devices[deviceNumber]
    };
    
    debug('PortalDetails.Info', portalDetails.info, allowDebug);
    
    let genieRPC_Header = Object.assign({}, genieAppHeader, {
      'Authorization': `Token: ${loginToken}`,
      'Content-Type': 'application/json',
    });

    // 5: open/close, get battery, get status
    const includeBattery = action === 'status-and-batt';
    
    switch(action) {
      case 'open':
        return await openClose(1, user, genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug);
      case 'close':
        return await openClose(0, user, genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug);
      case 'battery':
        return await getBattery(genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug);
      case 'status':
      case 'status-and-batt':
      default:
        return await getStatus(genieRPC_URI, genieRPC_Header, genieRPC_Auth, doorNumber, allowDebug, includeBattery);
    }
  } catch (err) {
    debug('Error details', err, allowDebug);
    return 'STOPPED';
  }
}

// keping the callback signature for backwards compatibility
module.exports = (user, password, action, callback, deviceNumber, doorNumber, allowDebug) => {
  deviceNumber = deviceNumber || 0;
  doorNumber = doorNumber || 1;
  allowDebug = allowDebug || false;

  sendCommandToDoor(user, password, action, deviceNumber, doorNumber, allowDebug)
  .then(result => callback(result))
  .catch(err => {
    debug('Error details', err, allowDebug);
  });
};
