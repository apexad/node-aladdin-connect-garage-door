# Node tool for Aladdin Connect Garage Door
[![NPM Version](https://img.shields.io/npm/v/node-aladdin-connect-garage-door.svg)](https://www.npmjs.com/package/node-aladdin-connect-garage-door)

This tool can be used to check the `status` and `open`/`close` an Aladdin Connect Garage Door via a Node.js script.

## Example Script
```javascript
var aladdinGarageDoor = require('node-aladdin-connect-garage-door');
var allowDebug = true;
var action = 'status';
var deviceNumber = 0;
var garageNumber = 1;

function callback(text)  {
  console.log(text);
}

aladdinGarageDoor('USERNAME/EMAIL', 'PASSWORD', action, callback, deviceNumber, garageNumber, allowDebug);
```

## Function Parameters
Parameter       | Description
----------------|------------
USERNAME/EMAIL  | **(required)** Your Genie Aladdin Connect Username (usually an email address)
PASSWORD        | **(required)** Your Genie Aladdin Connect Password
action          | **(required, invalid default: status)** status, battery, status-and-batt, open, or close
callback        | **(required)** action callback, function parameter is action result (like door status or battery level).
deviceNumber    | **(optional - 0, 1, 2, default: 0)** Use for multiple Garage Door controller devices on 1 account
garageNumber    | **(optional - 1, 2, 3, default: 1)** Use for multiple Garage Doors connected to a single device
allowDebug      | **(optional - true, false, default: false)** Set to true for more logs to be generated

## Actions
Action          | Callback function results
----------------|--------------------------
status          | String(OPENING, OPEN, CLOSING, CLOSED)
battery         | Integer(% of Battery Level)
status-and-batt | String(status:battery)
open            | String(OPENING)
close           | String(CLOSING)

## Credits
Uses API Documentation from  [aladdin connect postman](https://documenter.getpostman.com/view/5856894/RzZAjHxV) which was implemented via python by [shoejosh](https://github.com/shoejosh/aladdin-connect).

## Home Automation
This can be used in a home automation program that will run commands to check status, open, and close a garage door.  
If using homebridge, just use [homebridge-aladdin-connect-garage-door](https://github.com/iAnatoly/homebridge-aladdin-connect-garage-door)
