/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/app.d.ts" />

import azure = require('azure-storage');
import _ = require('lodash');
import Q = require('q');

class AzureClient {
    private _blobSvc: azure.BlobService;
    private _container = 'valentino';
    private _photoIdsBlob = 'photoids';
    private _accessTokenBlob = 'accesstoken';

    constructor(storageAccount: string, storageAccessKey: string) {
        this._blobSvc = azure.createBlobService(storageAccount, storageAccessKey);
    }

    storePhotoIds(photoIds: string[]) {
        if (this._blobSvc) {
            return this._createContainer().then(() => {
              return this._createBlob(this._photoIdsBlob, JSON.stringify(photoIds));  
            });
        } else {
            console.log('azure storage is not initailized');
            Q.reject();
        }
    }

    retrievePhotoIds() {
        if (this._blobSvc) {
            return this._retrieveBlob(this._container, this._photoIdsBlob);
        } else {
            console.log('azure storage is not initailized');
            Q.reject();
        }
    }

    private _createContainer() {
        let deferred = Q.defer();
        this._blobSvc.createContainerIfNotExists(this._container, (error, result, response) => {
            if (error) {
                console.log(error.message);
                deferred.reject(error);
            }
            deferred.resolve(response);
        });
        return deferred.promise;
    }
    
    private _createBlob(blobName: string, textToStore: string) {
        let deferred = Q.defer();
        this._blobSvc.createBlockBlobFromText(this._container, blobName, textToStore, {}, (error, result, response) => {
            if (error) {
                console.log(error.message);
                deferred.reject(error);
            }
            console.log(result);
            deferred.resolve(result);
        });
        return deferred.promise;
    }
    
    private _retrieveBlob(container: string, blob: string) {
        let deferred = Q.defer();
        this._blobSvc.getBlobToText(container, blob, {}, (error, result, response) => {
            if (error) {
                console.log(error.message);
                deferred.reject(error);
            }
            deferred.resolve(result);
        });
        return deferred.promise;
    }
}

export = AzureClient