const {TextEncoder, TextDecoder} = require('util');

// jsdom does not provide TextEncoder/TextDecoder, which @croct/sdk relies on for token signing.
global.TextEncoder ??= TextEncoder;
global.TextDecoder ??= TextDecoder;
