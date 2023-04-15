const base64 = require('nodejs-base64-encode');
const request = require('./request.js');

module.exports = {
    authorizationSpaces: {
        common: {
            bearer: {
                expiresIn: 0,
                token: String('')
            },
            authorizationCode: String(''),
        }
    },

    makeAuthorizationCode: function (tokenRoutee, secretRoutee) {

        let regexRule = new RegExp(/[.*#<>+\-?^${}()|[\]\\]/g);
        let stringBeforeBase64Encode = String('');
        let stringAfterBase64Encode = String('');

        if (tokenRoutee.length > 64 || secretRoutee.length > 64) {
            throw new Error('Token or Secret is too long');
        }

        if (regexRule.test(tokenRoutee) || regexRule.test(secretRoutee)) {
            throw new Error('Special characters are not allowed');
        }

        stringBeforeBase64Encode = tokenRoutee + ':' + secretRoutee;
        stringAfterBase64Encode = base64.encode(stringBeforeBase64Encode, 'base64');

        return stringAfterBase64Encode;
    },

    setAuthorizationCode: function (authorizationCode, space) {

        space = space || 'common';
        this.authorizationSpaces[space]['authorizationCode'] = authorizationCode;
    },

    makeAndSetAuthorizationCode: function (tokenRoutee, secretRoutee, space) {

        let authorizationCode = this.makeAuthorizationCode(tokenRoutee, secretRoutee);
        this.setAuthorizationCode(authorizationCode, space);
    },

    getAuthorizationCode: function (space) {

        space = space || 'common';
        return this.authorizationSpaces[space]['authorizationCode'];
    },

    requestRouteeBearer: async function (authorizationCode) {

        let response = new Array();

        let form = 'grant_type=client_credentials';
        let optionsToGetBearer = {
            'headers': {
                'Authorization': 'Basic ' + authorizationCode.toString(),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            'hostname': 'auth.routee.net',
            'path': '/oauth/token',
            'port': 443,
            'method': 'POST'
        };

        response = await request(optionsToGetBearer, form);

        if (response[1] == 400 || response[1] == 401) {
            return [];
        }

        return JSON.parse(response[0]);
    },

    setRouteeBearer: function (bearer, space) {

        space = space || 'common';
        this.authorizationSpaces[space]['bearer']['expiresIn'] = bearer.expiresIn || 60;
        this.authorizationSpaces[space]['bearer']['token'] = bearer.token || '';
    },

    requestAndSetRouteeBearer: async function (authorizationCode, space) {

        space = space || 'common';
        let currentTime = new Date().getTime() / 1000;
        let spaceBearer = this.authorizationSpaces[space]['bearer']

        if (authorizationCode === this.authorizationSpaces[space]['authorizationCode']
            && (spaceBearer['expiresIn'] - currentTime) > 5) {
            return spaceBearer['token'];
        }

        const response = await this.requestRouteeBearer(authorizationCode);

        this.authorizationSpaces[space]['authorizationCode'] = authorizationCode;

        if (response.length === 0) {
            spaceBearer['expiresIn'] = 0;
            spaceBearer['token'] = String('');
            throw new Error('Tried to get access token. Received response status 400/401');
        }

        spaceBearer['expiresIn'] = response['expires_in'];
        spaceBearer['token'] = response['access_token'];
    },

    getRouteeBearer: function (space) {

        space = space || 'common';
        return this.authorizationSpaces[space]['bearer'];
    },

    fullAuthorizationProcess: async function (tokenRoutee, secretRoutee, space) {
        
        let authorizationCode = this.makeAuthorizationCode(tokenRoutee, secretRoutee);
        this.setAuthorizationCode(authorizationCode, space);
        await this.requestAndSetRouteeBearer(authorizationCode, space);
    },

    createNewSpace: function (spaceName) {

        let newSpace = Object();
        newSpace[spaceName] = {
            bearer: {
                expiresIn: 0,
                token: String('')
            },
            authorizationCode: String(''),
        }
        Object.assign(this.authorizationSpaces, newSpace);
    }
}


