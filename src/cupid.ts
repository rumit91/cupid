/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import _ = require('lodash');
import Q = require('q');
import User = require('./user');
import Message = require('./message');
import FBClient = require('./fbClient');
import AzureClient = require('./azureClient');
import request = require('request');

class Cupid {
    private _fbClient: FBClient;
    private _azureClient: AzureClient;
    private _useAltUserToPost = false;
    private _user: User;
    private _accessToken: string;
    private _googleApiKey: string;
    private _postImage = 'http://i.imgur.com/sikWsoa.png';
    private _facebookPhotoUrl = 'https://www.facebook.com/photo.php?fbid=';
    private _postedOutOfPhotosMessage = false;
    private _isReady = false;

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

    constructor(user: User, accessToken: string, useAltUserToPost: boolean, fbClient: FBClient, azureClient: AzureClient, googleApiKey: string) {
        this._user = user;
        this._accessToken = accessToken;
        this._useAltUserToPost = useAltUserToPost;
        this._fbClient = fbClient;
        this._azureClient = azureClient;
        this._googleApiKey = googleApiKey;
        this._isReady = true;
        console.log('Cupid is ready!');
    }

    isReady() {
        return this._isReady;
    }

    postSpecialMessage() {
        this._azureClient.retrieveSpecialMessages().then<any>((value: string) => {
            let specialMessages: Message[] = JSON.parse(value);
            if (specialMessages.length > 0) {
                const post = specialMessages[0];
                this._fbClient.setAccessToken(this._accessToken);
                this._fbClient.postToGroupFeed(this._user.groupId, post.message, post.link, post.linkPicture, post.linkTitle);
                console.log('posting a special message');
            } else {
                console.log('no more messages to post');
            }
            if (specialMessages.length > 1) {
                specialMessages = specialMessages.slice(1);
            } else {
                specialMessages = [];
            }
            this._azureClient.storeSpecialMessages(specialMessages);
        })
    }
    
    // TODO: clean up this method
    postPhoto() {
        this._fbClient.setAccessToken(this._accessToken);
        this._azureClient.retrievePhotoIds().then<any>((value: string) => {
            let photoIds: string[] = JSON.parse(value);
            const message = this._getPostMessage();
            const photoId = _.sample(photoIds);
            console.log('About to post ' + photoId);
            if (photoId) {
                const linkTitle = this._getPhotoTitle();
                const facebookPhotoUrl = this._facebookPhotoUrl + photoId;
                this._fbClient.getPhoto(photoId).then<any>((res) => {
                    photoIds = _.filter(photoIds, photo => {
                        return photo !== photoId;
                    });
                    this._azureClient.storePhotoIds(photoIds).fail(reason => {
                        console.log('could not store blob');
                        console.log(reason);
                    });
                    this._fbClient.postToGroupFeed(this._user.groupId, message, facebookPhotoUrl, this._postImage, linkTitle);
                    console.log(photoIds.length);
                }).fail(reason => {
                    photoIds = _.filter(photoIds, photo => {
                        return photo !== photoId;
                    });
                    this._azureClient.storePhotoIds(photoIds).fail(reason => {
                        console.log('could not store blob');
                        console.log(reason);
                    });;
                    this._shortenUrl(facebookPhotoUrl).then<any>((shortUrl: string) => {
                        this._fbClient.postToGroupFeed(this._user.groupId, message, shortUrl, this._postImage, linkTitle);
                    });
                    console.log(photoIds.length);
                });
            } else if (photoIds.length === 0 && !this._postedOutOfPhotosMessage) {
                const message = 'I wanted to post a photo of you two, but I\'m all out of them :(\n'
                    + 'Here\'s a consolation video.';
                const consolationVideo = 'https://www.youtube.com/watch?v=f5KyMNDJE6o';
                this._fbClient.postToGroupFeed(this._user.groupId, message, consolationVideo, '', '');
                this._postedOutOfPhotosMessage = true;
            }
        }).fail(reason => {
            console.log('Could not access photoids blob');
            console.log(reason);
        });
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
        if (!this._useAltUserToPost || this._user.userId === this._user.postingUserId) {
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
