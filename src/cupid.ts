/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import _ = require('lodash');
import Q = require('q');
import schedule = require('node-schedule');
import User = require('./models/user');
import FBClient = require('./fbClient');
import request = require('request');

class Cupid {
    private _fbClient: FBClient;
    private _useAlternativeUserToPost = false;
    private _user: User;
    private _googleApiKey: string;
    private _postImage = 'http://i.imgur.com/sikWsoa.png';
    private _facebookPhotoUrl = 'https://www.facebook.com/photo.php?fbid='
    
    constructor(user: User, useAlternativeUserToPost: boolean, fbClient: FBClient, googleApiKey: string) {
        this._user = user;
        this._useAlternativeUserToPost = useAlternativeUserToPost;
        this._fbClient = fbClient;
        this._googleApiKey = googleApiKey;
    }
    
    start() {
        if (this._user) {
            this._schedulePostingJob();
        }
    }
    
    postPhoto() {
        this._fbClient.setAccessToken(this._user.accessToken);
        const message = this._getPostMessage();
        const photoId = _.sample(this._user.photoIdsWithSO);
        const linkTitle = this._getPhotoTitle();
        const facebookPhotoUrl = this._facebookPhotoUrl + photoId;
        this._fbClient.getPhoto(photoId).then<any>((res) => {
            console.log('Can access photo!');
            this._fbClient.postToGroupFeed(this._user.groupId, message, facebookPhotoUrl, this._postImage, linkTitle);
        }).fail(reason => {
            console.log('Can\'t access photo :(');
            this._shortenUrl(facebookPhotoUrl).then<any>((shortUrl: string) => {
                this._fbClient.postToGroupFeed(this._user.groupId, message, shortUrl, this._postImage, linkTitle);
            });
        });
    }
    
    private _getPhotoTitle(): string {
        const soFirstName = this._user.soName.split(' ')[0];
        const userFirstName = this._user.userName.split(' ')[0];
        return 'Photo of ' + soFirstName + ' & ' + userFirstName;
    }
    
    private _getPostMessage(): string {
        return 'Enjoy this photo <3';
    }
       
    private _schedulePostingJob() {
        const cronString = '0 * * * * *'; // Run every min;
        schedule.scheduleJob(cronString, () => {
            this.postPhoto();
        });
    }
    
    private _shortenUrl(urlToShorten: string) {
        let deferred = Q.defer();
        const urlShortnerApiEndpoint = 'https://www.googleapis.com/urlshortener/v1/url?key=' + this._googleApiKey;   
        request.post(urlShortnerApiEndpoint, {
            json: {
                longUrl: urlToShorten
            }
        }, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                console.log('body');
                console.log(body);
                deferred.resolve(body.id);
            } else {
                console.log('error');
                console.log(body);
                deferred.reject(new Error(error));
            }
        });
        return deferred.promise;
    }
}

export = Cupid;
