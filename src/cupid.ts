/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import _ = require('lodash');
import Q = require('q');
import schedule = require('node-schedule');
import User = require('./models/user');
import FBClient = require('./fbClient');

class Cupid {
    private _fbClient: FBClient;
    private _useAlternativeUserToPost = false;
    private _user: User;
    private _postImage = 'http://i.imgur.com/sikWsoa.png';
    private _facebookPhotoUrl = 'https://www.facebook.com/photo.php?fbid='
    
    constructor(user: User, useAlternativeUserToPost: boolean, fbClient: FBClient) {
        this._user = user;
        this._useAlternativeUserToPost = useAlternativeUserToPost;
        this._fbClient = fbClient;
    }
    
    start() {
        if (this._user) {
            this._schedulePostingJob();
        }
    }
    
    postPhoto() {
        this._fbClient.setAccessToken(this._user.accessToken);
        const photoId = _.sample(this._user.photoIdsWithSO);
        const linkUrl = this._facebookPhotoUrl + photoId;
        const linkTitle = 'Photo of ' + this._user.soName + ' & ' + this._user.userName;
        this._fbClient.postToGroupFeed(this._user.groupId, 'Enjoy this photo <3', linkUrl, this._postImage, linkTitle);
    }
    
    private _schedulePostingJob() {
        const cronString = '0 * * * * *'; // Run every min;
        schedule.scheduleJob(cronString, () => {
            this.postPhoto();
        });
    }
    
}

export = Cupid;
