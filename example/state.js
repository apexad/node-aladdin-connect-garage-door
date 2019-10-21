var aladdinGarageDoor = require('node-aladdin-connect-garage-door');

function callback(text)  {
  console.log(text);
}

aladdinGarageDoor(
    'USER',         // your username 
    'PASSWORD',     // your password
    'status',       // command - get status
    callback,       // callback that handles response from the API
    0,              // garage #0
    1,              // door #1
    true            // allow debug
);
