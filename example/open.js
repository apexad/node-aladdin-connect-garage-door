var aladdinGarageDoor = require('node-aladdin-connect-garage-door');

function callback(text)  {
  console.log(text);
}

aladdinGarageDoor('USER', 'PASSWORD', 'open', callback, 0, 1);
