/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import Greeter = require('./greeter');
import express = require('express');
import fb = require('FB');
import nconf = require('nconf');

nconf.file({ file: './config.json' });
const FB_APP_ID = nconf.get('fbAppId');
const FB_APP_SECRET = nconf.get('fbAppSecret');

const app = express();
const greeter = new Greeter('friend');

app.get('/', (req, res) => {
    fb.api('10153313017289153', (fbres) => {
        if (!fbres) {
            console.log(fbres.error);
        } else {
            console.log(fbres);
            greeter.greeting = fbres.name;
            res.send(greeter.greet());
        }
    });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
