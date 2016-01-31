/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import fb = require('FB');
import _ = require('lodash');
import Q = require('q');

class FBClient {
    private _fbAppId: string;
    private _fbAppSecret: string;
    private _permissions = ['public_profile', 'user_friends', 'user_photos', 'user_posts', 'user_managed_groups', 'publish_actions'];
    private _accessToken: string;

    constructor(fbAppId: string, fbAppSecret: string) {
        this._fbAppId = fbAppId;
        this._fbAppSecret = fbAppSecret;
    }

    getFacebookAuthUrl(redirectUrl: string) {
        return 'https://www.facebook.com/dialog/oauth?client_id=' + this._fbAppId
            + '&redirect_uri=' + encodeURIComponent(redirectUrl)
            + '&scope=' + this._permissions.join(',');
    }

    getAccessTokenFromCode(code: string, redirectUrl: string) {
        let deferred = Q.defer();
        fb.api('oauth/access_token', {
            client_id: this._fbAppId,
            client_secret: this._fbAppSecret,
            redirect_uri: redirectUrl,
            code: code
        }, (res) => {
             if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);           
        });
        return deferred.promise;
    }
    
    setAccessToken(accessToken: string) {
        this._accessToken = accessToken;
    }
    
    getMe() {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        fb.api('me', (res) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);
        });
        return deferred.promise;
    }
    
    getMyGroups() {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        fb.api('me/groups', (res) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            console.log(res);
            deferred.resolve(res);
        });
        return deferred.promise;
    }
    
    getPhotosOfMe(after?: string) {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        const fields = '&fields=id,created_time,name';
        const apiEndpoint = 'me/photos?limit=1000' + fields + (after ? ('&after=' + after) : '');
        fb.api(apiEndpoint, (res) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);
        });
        return deferred.promise;
    }
    
    getPeopleTaggedInPhoto(photoId: string) {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        fb.api(photoId + '/tags', (res) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);
        });
        return deferred.promise;
    }
    
    postToGroupFeed(groupId: string, message: string, link: string, linkPicture: string, linkTitle: string) {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        fb.api(groupId + '/feed', 'POST', {
            message: message,
            link: link,
            picture: linkPicture,
            name: linkTitle
        }, (res: any) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);
        });
        return deferred.promise;
    }
    
    getPhoto(photoId: string) {
        let deferred = Q.defer();
        fb.setAccessToken(this._accessToken);
        fb.api(photoId + '?fields=images', (res) => {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                deferred.reject(new Error(!res ? 'error occurred' : res.error));
            }
            deferred.resolve(res);
        });
        return deferred.promise;
    }
}

export = FBClient;
