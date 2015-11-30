//For browser javascript
if (typeof Keen !== 'undefined') {
    var keenClient = new Keen({
        projectId: '555b6f9790e4bd76add9931c',
        writeKey: '39507467a54ee1a4b6637291ad38af72b20aee1f273c37ea7b1036c2e100f90222a0ae8f6a5db3248d6ef5d657dd6f6aac60087553f44b22601d215a052708392f0ed9a74cb861aa483d0805503b0d5c7c7af8fbe7264f1609e8daddd05da4489aa71659e2951550e0d6d77e28a12e7e'
    });
}

//For Node.js
if (typeof exports !== 'undefined') {
    exports.getKeys = function() {
        return {
            projectId: '555b6f9790e4bd76add9931c',
            writeKey: '39507467a54ee1a4b6637291ad38af72b20aee1f273c37ea7b1036c2e100f90222a0ae8f6a5db3248d6ef5d657dd6f6aac60087553f44b22601d215a052708392f0ed9a74cb861aa483d0805503b0d5c7c7af8fbe7264f1609e8daddd05da4489aa71659e2951550e0d6d77e28a12e7e'
        };
    };
}
