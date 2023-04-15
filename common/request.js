const httpRequest = require('https');

module.exports = async function (options, postData) {
    
    return new Promise((resolve, reject) => {
        let request = httpRequest.request(options, async (response) => {
            let chunks = new Array();
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });
            response.on('end', (chunk) => {
                let body = Buffer.concat(chunks);
                resolve([body.toString(), response.statusCode]);
            });
            response.on('error', (error) => {
                reject(error);
            });
        });
        request.write(postData);
        request.on('error', (error) => {
            reject(error);
        });
        request.end();
    });
}