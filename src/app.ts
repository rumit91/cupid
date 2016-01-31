/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import User = require('./models/user');
import FBClient = require('./fbClient');
import Cupid = require('./cupid');
import express = require('express');
import nconf = require('nconf');
import jade = require('jade');
import _ = require('lodash');
import Q = require('q');

// Access config
nconf.file({ file: './config.json' });
const FB_APP_ID = nconf.get('fbAppId');
const FB_APP_SECRET = nconf.get('fbAppSecret');
const GOOGLE_API_KEY = nconf.get('googleApiKey');
const baseUrl = nconf.get('baseUrl');
let user: User = nconf.get('user');

interface fbImageMetaData {
    id: string;
    createdTime: string; 
    name?: string;
}

interface fbImageTag {
    id: string;
    name: string;
}

class WebApp {
    private _app: express.Express;
    private _facebookRedirect = '/fbLoginRedirect';
    private _baseUrl: string;
    private _fbClient: FBClient;
    private _useAlternativeUserToPost = false;
    private _cupid: Cupid;

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
            res.redirect(this._fbClient.getFacebookAuthUrl(this._baseUrl + this._facebookRedirect));
        });
        
        // Login redirect: Convert the code provided by Facebook into an access token.
        this._app.get(this._facebookRedirect, (req, res) => {
            this._convertCodeToToken(res, req.query.code);
        });
        
        this._app.get('/cupid', (req, res) => {
            this._createCupid(res);
        });
    }

    private _convertCodeToToken(res: express.Response, code: string) {
        this._fbClient.getAccessTokenFromCode(code, this._baseUrl + this._facebookRedirect).then<any>((fbres: any) => {
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
                this._getPhotos(res);
            } else if (user.userId !== user.postingUserId && fbres.id === user.postingUserId) {
                // Using alternate user to post.
                user.accessToken = fbAccessToken;
                user.tokenExpiration = fbTokenExpiration;
                this._useAlternativeUserToPost = true;
                res.render('cupid');
            } else {
                res.send('Sorry your id (' + fbres.id + ') does not match the one specified in the config file.');
            }
        });
    }
    private _getPhotos(res: express.Response) {
        this._fbClient.getPhotosOfMe().then<any>((fbres: any) =>{
            let photos: fbImageMetaData[] = fbres.data;
            let after: string = fbres.paging.cursors.after;
            let promises: Q.IPromise<any>[] = [];
            _.each(photos, photo => {
                promises.push(this._checkIfPhotoHasSO(photo));
            });
            Q.all(promises).then<any>((values) =>{
                user.photoIdsWithSO = _.filter(values, value => {
                    return value != '';
                });
                res.send(user.photoIdsWithSO);
            }).fail((reason) => {
               console.log('Rejected promise: ' + reason);
            });
        });
    }
    
    private _checkIfPhotoHasSO(photo: fbImageMetaData) {
        return this._fbClient.getPeopleTaggedInPhoto(photo.id).then((fbres: any) => {
             let tags: fbImageTag[] = fbres.data;
             let tagsOfSO = _.filter(tags, tag => {
                 return tag.id === user.soId || tag.id === user.alternateSoId;
             });
             if (tagsOfSO.length > 0) {
                 return photo.id;
             }
             return '';                 
         });
    }
    
    private _createCupid(res: express.Response) {
        if (user.accessToken !== '') {
            this._cupid = new Cupid(user, this._useAlternativeUserToPost, this._fbClient, GOOGLE_API_KEY);
            this._cupid.postPhoto();
            //this._cupid.start();
            res.send('Cupid has been started <3');
        } else {
            res.send('No access token :(');
        }
    }
}

let app = new WebApp(baseUrl, new FBClient(FB_APP_ID, FB_APP_SECRET));
app.start();
