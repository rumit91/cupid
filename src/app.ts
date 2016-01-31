/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import Greeter = require('./greeter');
import express = require('express');
import fb = require('FB');
import nconf = require('nconf');
import request = require('request');
import url = require('url');

nconf.file({ file: './config.json' });
const FB_APP_ID = nconf.get('fbAppId');
const FB_APP_SECRET = nconf.get('fbAppSecret');

const app = express();
const greeter = new Greeter('friend');

let fbShortLivedAccessToken: string = '';
let fbTokenExpiration: number = 0;

let baseUrl = 'http://localhost:3000';
let facebookLoginRedirect = '/fbCodeRedirect';

// Immediatly redirect to the Facbook Auth flow 
app.get('/', (req, res) => {
    let fbUrl = 'https://www.facebook.com/dialog/oauth?client_id=' + FB_APP_ID
        + '&redirect_uri=' + encodeURIComponent(baseUrl + facebookLoginRedirect)
        + '&scope=' + 'public_profile,user_friends,user_photos,user_posts,user_managed_groups';
    res.redirect(fbUrl);
});

// Convert the code provided by Facebook into an access token.
app.get(facebookLoginRedirect, (req, res) => {
    const code = req.query.code;
    
    fb.api('oauth/access_token', {
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: baseUrl + facebookLoginRedirect,
        code: code
    }, (fbres: any) => {
        if (!fbres || fbres.error) {
            console.log(!fbres ? 'error occurred' : fbres.error);
            return;
        }
        fbShortLivedAccessToken = fbres.access_token;
        fbTokenExpiration = fbres.expires ? fbres.expires : 0;
        res.redirect('/greet');
    });
});

app.get('/greet', (req, res) => {
    fb.setAccessToken(fbShortLivedAccessToken);
    fb.api('197428033930849', (fbres) => {
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
  console.log('Listening on port 3000!');
});
