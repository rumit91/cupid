/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import _ = require('lodash');
import Q = require('q');
import User = require('./user');
import FBClient = require('./fbClient');
import request = require('request');

class Cupid {
    private _fbClient: FBClient;
    private _useAlternativeUserToPost = false;
    private _user: User;
    private _googleApiKey: string;
    private _postImage = 'http://i.imgur.com/sikWsoa.png';
    private _facebookPhotoUrl = 'https://www.facebook.com/photo.php?fbid=';
    private _postedOutOfPhotosMessage = false;   
    
    private _photoMessages = [
        'Enjoy this photo <3',
        'You two are so cute!!!',
        'I wish I was this good looking!',
        'Look at you guys! Beautiful!',
        'Remember this?',
        'You guys are so awesome!',
        ':)',
        'I hope you like this one!',
        'Ah good times...',
        'Here\'s a good one!'
    ];
    
    constructor(user: User, useAlternativeUserToPost: boolean, fbClient: FBClient, googleApiKey: string) {
        this._user = user;
        this._useAlternativeUserToPost = useAlternativeUserToPost;
        this._fbClient = fbClient;
        this._googleApiKey = googleApiKey;
        this._isReady = true;
        console.log('Cupid is ready!');
    }

    isReady() {
        return this._isReady;
    }
    
    postInitialMessage() {
        const link = 'https://www.youtube.com/watch?v=VPRjCeoBqrI';
        const message = '💘Hi ' + this._getCoupleNames() + '!💘 \n\n'
                      + 'Valentine\'s Day is coming up and I\'ve been assigned to be your cupid this year! ' 
                      + 'For the next 10 days I\'ll send you photos of the two of you to remind you of all the amazing times you\'ve had together 💑\n\n'
                      + 'To start things off maybe ' + this._user.userName.split(' ')[0] + ' can sing you this song? :P';
        this._fbClient.postToGroupFeed(this._user.groupId, message, link, '', '');
    }
    
    postPhoto() {
        this._fbClient.setAccessToken(this._user.accessToken);
        const message = this._getPostMessage();
        const photoId = _.sample(this._user.photoIdsWithSO);
        if(photoId) {
            const linkTitle = this._getPhotoTitle();
            const facebookPhotoUrl = this._facebookPhotoUrl + photoId;
            this._fbClient.getPhoto(photoId).then<any>((res) => {
                this._user.photoIdsWithSO = _.filter(this._user.photoIdsWithSO, photo =>{
                    return photo !== photoId;
                });
                this._fbClient.postToGroupFeed(this._user.groupId, message, facebookPhotoUrl, this._postImage, linkTitle);
            }).fail(reason => {
                this._shortenUrl(facebookPhotoUrl).then<any>((shortUrl: string) => {
                    this._fbClient.postToGroupFeed(this._user.groupId, message, shortUrl, this._postImage, linkTitle);
                });
            });
        } else if(this._user.photoIdsWithSO.length === 0 && !this._postedOutOfPhotosMessage) {
            const message = 'I wanted to post a photo of you two, but I\'m all out of them :(\n' 
                          + 'Here\'s a consolation video.' 
            const consolationVideo = 'https://www.youtube.com/watch?v=f5KyMNDJE6o';
            this._fbClient.postToGroupFeed(this._user.groupId, message, consolationVideo, '', '');
            this._postedOutOfPhotosMessage = true;
        }
    }
    
    private _getPhotoTitle(): string {
        return 'Photo of ' + this._getCoupleNames();
    }
    
    private _getCoupleNames(): string {
        const soFirstName = this._user.soName.split(' ')[0];
        const userFirstName = this._user.userName.split(' ')[0];
        return soFirstName + ' & ' + userFirstName;
    }
    
    private _getPostMessage(): string {
        let message = _.sample(this._photoMessages);
        if (!this._useAlternativeUserToPost || this._user.userId === this._user.postingUserId) {
            message = '"' + message + '" - Your Cupid';
        }
        return message;
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
