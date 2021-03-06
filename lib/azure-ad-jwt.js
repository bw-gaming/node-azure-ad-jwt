var exports = module.exports;

exports.AzureActiveDirectoryValidationManager = require('./azure-ad-validation-manager.js');

exports.verify = function (jwtString, options, callback) {

    var aadManager = new exports.AzureActiveDirectoryValidationManager();

    let fetchCommon = false, useV2issuer = false;

    var tokenVersion = aadManager.getVersion(jwtString);
    if (tokenVersion === '2.0') {
        fetchCommon = true;
        useV2issuer = true;
    }

    // get the tenant id from the token
    var tenantId = aadManager.getTenantId(jwtString);

    // check if it looks like a valid AAD token
    if (!tenantId) {
        return callback(new Error(-1, 'Not a valid AAD token'), null)
    }

    if (fetchCommon) {
        // download the common v2.0 open id config
        aadManager.requestOpenIdConfig('common/v2.0', function (err, openIdConfigCommon) {
            // download the signing certificates from Microsoft for common (Microsoft) accounts
            aadManager.requestSigningCertificates(openIdConfigCommon.jwks_uri, options, function (err, certificates) {

                // download the signing certificates from Microsoft for this specific tenant
                aadManager.requestOpenIdConfig(tenantId, function (err, openIdConfig) {

                    // download the signing certificates from Microsoft for this specific tenant
                    aadManager.requestSigningCertificates(openIdConfig.jwks_uri, options, function (err, certificates) {

                        // verify against all certificates
                        aadManager.verify(jwtString, certificates, useV2issuer, options, callback);
                    })
                });
            });
        });
    } else {
        // download the open id config
        aadManager.requestOpenIdConfig(tenantId, function (err, openIdConfig) {

            // download the signing certificates from Microsoft for this specific tenant
            aadManager.requestSigningCertificates(openIdConfig.jwks_uri, options, function (err, certificates) {

                // verify against all certificates
                aadManager.verify(jwtString, certificates, useV2issuer, options, callback);
            })
        });
    }
}