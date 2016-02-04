/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import User = require('./user');
import Message = require('./message');
import FBClient = require('./fbClient');
import AzureClient = require('./azureClient');
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
const port = process.env.port || 3000;

const AZURE_STORAGE_ACCOUNT = process.env.storageAccount || nconf.get('storageAccount');
const AZURE_STORAGE_ACCESS_KEY = process.env.storageAccesskey || nconf.get('storageAccesskey');

interface fbImageMetaData {
    id: string;
    created_time: string;
    name?: string;
    from?: {
        name: string,
        id: string,
    },
    images?: {
        height: number;
        width: number;
        source: string;
    }[];
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
    private _azureClient: AzureClient;
    private _cupid: Cupid;

    constructor(baseUrl: string, fbClient: FBClient, azureClient: AzureClient) {
        this._baseUrl = baseUrl;
        this._fbClient = fbClient;
        this._azureClient = azureClient;
        this._app = express();
        this._app.set('view engine', 'jade');
        this._setupRoutes();
    }

    start() {
        this._app.listen(port, function() {
            console.log('Listening on port ' + port + '!');
        });
    }

    private _setupRoutes() {
        // Base route
        this._app.get('/', (req, res) => {
            res.render('index');
        });
        
        // Login route: immediatly redirect to the Facbook Auth flow
        this._app.get('/login', (req, res) => {
            console.log(this._baseUrl + this._facebookRedirect);
            res.redirect(this._fbClient.getFacebookAuthUrl(this._baseUrl + this._facebookRedirect));
        });
        
        // Login redirect: Convert the code provided by Facebook into an access token.
        this._app.get(this._facebookRedirect, (req, res) => {
            this._convertCodeToToken(res, req.query.code);
        });

        this._app.get('/cupid', (req, res) => {
            this._createCupid(res);
        });

        this._app.get('/cupid/photo', (req, res) => {
            if (this._cupid && this._cupid.isReady()) {
                this._cupid.postPhoto();
                res.send('Posting a photo');
            } else {
                console.log('Cupid is not ready :(');
                res.send('Cupid is not ready :(');
            }
        });
        
        this._app.get('/cupid/message', (req, res) => {
            if (this._cupid && this._cupid.isReady()) {
                this._cupid.postSpecialMessage();
                res.send('Posting a special message');
            } else {
                console.log('Cupid is not ready :(');
                res.send('Cupid is not ready :(');
            }
        });
        
        this._app.get('/storeMessages', (req, res) => {
           this._storeSpecialMessages(res); 
        });
    }

    private _convertCodeToToken(res: express.Response, code: string) {
        console.log(this._baseUrl + this._facebookRedirect);
        this._fbClient.getAccessTokenFromCode(code, this._baseUrl + this._facebookRedirect).then<any>((fbres: any) => {
            const fbTokenExpiration = new Date(new Date().getTime() + (fbres.expires ? (fbres.expires*1000) : 0));
            this._confirmAndSaveAccessToken(res, fbres.access_token, fbTokenExpiration);
        });
    }

    private _confirmAndSaveAccessToken(res: express.Response, fbAccessToken: string, fbTokenExpiration: Date) {
        this._fbClient.setAccessToken(fbAccessToken);
        this._fbClient.getMe().then<any>((fbres: any) => {
            if (fbres.id === user.userId) {
                this._azureClient.storeAccessToken(fbAccessToken, fbTokenExpiration).then(() => {
                    this._getPhotos(res);
                });
                
            } else if (user.userId !== user.postingUserId && fbres.id === user.postingUserId) {
                // Using alternate user to post.
                this._azureClient.storeAccessToken(fbAccessToken, fbTokenExpiration, true).then(() => {
                    res.redirect('./cupid');
                });
            } else {
                res.send('Sorry your id (' + fbres.id + ') does not match the one specified in the config file.');
            }
        });
    }
    private _getPhotos(res: express.Response) {
        this._fbClient.getPhotosOfMe().then<any>((fbres: any) => {
            let photos: fbImageMetaData[] = fbres.data;
            let after: string = fbres.paging.cursors.after;
            let promises: Q.IPromise<any>[] = [];
            /*
            let notMyPhotos = _.filter(photos, photo => {
               return photo.from.id !== user.userId; 
            });
            */
            _.each(photos, photo => {
                promises.push(this._checkIfPhotoHasSO(photo));
            });
            Q.all(promises).then<any>((values) => {
                let photoIdsWithSO = _.filter(values, value => {
                    return value != '';
                });
                this._azureClient.storePhotoIds(photoIdsWithSO).fail(reason => {
                    console.log('could not store blob');
                    console.log(reason);
                });
                res.send(photoIdsWithSO);
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
        // Try getting the alt user token.
        this._azureClient.retrieveAccessToken(true).then((value: string) => {
            let tokenAndExpiration = JSON.parse(value);
            this._cupid = new Cupid(user, tokenAndExpiration.accessToken, true, this._fbClient, this._azureClient, GOOGLE_API_KEY);
            this._cupid.postInitialMessage();
            res.send('Cupid has been started with alt user <3');
        }).fail(reason => {
            console.log('No alt user token found');
            // Try getting the regular user token.
            this._azureClient.retrieveAccessToken().then((value: string) => {
                let tokenAndExpiration = JSON.parse(value);
                this._cupid = new Cupid(user, tokenAndExpiration.accessToken, false, this._fbClient, this._azureClient, GOOGLE_API_KEY);
                this._cupid.postInitialMessage();
                res.send('Cupid has been started with regular user <3');
            }).fail(reason => {
                console.log('No access token');
                res.send('No access token :(');
            });
        });
    }
    
    private _storeSpecialMessages(res: express.Response) {
        nconf.file({ file: './messages.json' });
        let messages: Message[] = nconf.get('messages');
        console.log(messages);
        this._azureClient.storeSpecialMessages(messages).then<any>(value => {
            res.send('Saved messages in azure blob');
        }).fail(reason => {
           res.send('Could not save messages: ' + reason); 
        });
    }
}

let app = new WebApp(baseUrl,
    new FBClient(FB_APP_ID, FB_APP_SECRET),
    new AzureClient(AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY));
app.start();
