/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import User = require('./models/user');
import FBClient = require('./fbClient');
import express = require('express');
import nconf = require('nconf');
import jade = require('jade');
import _ = require('lodash');
import Q = require('q');

// Access config
nconf.file({ file: './config.json' });
const FB_APP_ID = nconf.get('fbAppId');
const FB_APP_SECRET = nconf.get('fbAppSecret');
const baseUrl = nconf.get('baseUrl');
let user: User = nconf.get('user');

class WebApp {
    private _app: express.Express;
    private _facebookRedirect = '/fbLoginRedirect';
    private _baseUrl: string;
    private _fbClient: FBClient;

    constructor(baseUrl: string, fbClient: FBClient) {
        this._baseUrl = baseUrl;
        this._fbClient = fbClient;

        this._app = express();
        this._app.set('view engine', 'jade');
        this._setupRoutes();
    }

    start() {
        this._app.listen(3000, function() {
            console.log('Listening on port 3000!');
        });
    }

    private _setupRoutes() {
        // Base route
        this._app.get('/', (req, res) => {
            res.render('index');
        });
        
        // Login route: immediatly redirect to the Facbook Auth flow
        this._app.get('/login', (req, res) => {
            console.log(this._fbClient.getFacebookAuthUrl(this._baseUrl + this._facebookRedirect));
            res.redirect(this._fbClient.getFacebookAuthUrl(this._baseUrl + this._facebookRedirect));
        });
        
        // Login redirect: Convert the code provided by Facebook into an access token.
        this._app.get(this._facebookRedirect, (req, res) => {
            console.log('about to convert code to token');
            this._convertCodeToToken(res, req.query.code);
        });
    }

    private _convertCodeToToken(res: express.Response, code: string) {
        this._fbClient.getAccessTokenFromCode(code, this._baseUrl + this._facebookRedirect).then<any>((fbres: any) => {
            console.log('convertCodeToToken fbres');
            console.log(fbres);
            const fbTokenExpiration = new Date(new Date().getTime() + (fbres.expires ? fbres.expires : 0));
            this._confirmAndSaveAccessToken(res, fbres.access_token, fbTokenExpiration);
        });
    }

    private _confirmAndSaveAccessToken(res: express.Response, fbAccessToken: string, fbTokenExpiration: Date) {
        this._fbClient.setAccessToken(fbAccessToken);
        this._fbClient.getMe().then<any>((fbres: any) => {
            if (fbres.id === user.userId) {
                user.accessToken = fbAccessToken;
                user.tokenExpiration = fbTokenExpiration;
                res.send('Ready to do actual work!');
            } else {
                res.send('Sorry your id does not match the one specified in the config file.');
            }
        });
    }
}

let app = new WebApp(baseUrl, new FBClient(FB_APP_ID, FB_APP_SECRET));
app.start();
