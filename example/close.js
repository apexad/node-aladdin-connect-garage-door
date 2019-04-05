var aladdinGarageDoor = require('node-aladdin-connect-garage-door');

function callback(text)  {
  console.log(text);
}

aladdinGarageDoor('USER', 'PASSWORD', 'close', callback, 0, 1);
