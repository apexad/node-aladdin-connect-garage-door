# Node tool for Aladdin Connect Garage Door
[![NPM Version](https://img.shields.io/npm/v/node-aladdin-connect-garage-door.svg)](https://www.npmjs.com/package/node-aladdin-connect-garage-door)

This tool can be used to check the `status` and `open`/`close` an Aladdin Connect Garage Door via a node script.

## Usage
```javascript
var aladdinGarageDoor = require('node-aladdin-connect-garage-door');
var allowDebug = true;

function callback(text)  {
  console.log(text);
}

aladdinGarageDoor('USER', 'PASSWORD', 'ACTION', callback, 'DEVICE_NUMBER', 'GARAGE_NUMBER', allowDebug);
```
Parameter       | Description
----------------|------------
USER            | Your Genie Aladdin Connect Username (usually an email address)
PASSWORD        | Your Genie Aladdin Connect Password
ACTION          | status, open, or close
callback        | a callback function
DEVICE_NUMBER   | (optional - 0, 1, 2) for multiple Garage Door Controllers
GARAGE_NUMBER   | (optional - 1, 2, 3) for multiple Garage Doors connected to a single device
allowDebug      | (optional - true, false) set to true for more logs to be generated (defaults to false)

The `callback` function to run and send current door state.  
If `ACTION` was status, it will get CLOSED or OPEN, otherwise it will get OPENING or CLOSING.

## Credits
Uses API Documentation from  [aladdin connect postman](https://documenter.getpostman.com/view/5856894/RzZAjHxV) which was implemented via python by [shoejosh](https://github.com/shoejosh/aladdin-connect).

## Home Automation
This can be used in a home automation program that will run commands to check status, open, and close a garage door.  
If using homebridge, just use [homebridge-aladdin-connect-garage-door](https://github.com/iAnatoly/homebridge-aladdin-connect-garage-door)
