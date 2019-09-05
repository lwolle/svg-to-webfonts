import fs from 'fs';
import crypto from 'crypto';

import handlebars from 'handlebars';
import urlJoin from 'url-join';
import { ObjectfromValues } from './utils/object-from-values';
import { ObjectfromEntries } from './utils/object-from-entries';

const transformCodepoints = (codepoints) => ObjectfromEntries((
    Object.entries(codepoints).map((entry) => [entry[0], entry[1].toString(16)])
));

/** Caclulates hash based on options and source SVG files */
const calcHash = (options) => {
    const hash = crypto.createHash('md5');
    options.files.forEach((file) => {
        hash.update(fs.readFileSync(file, 'utf8'));
    });
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
};

const makeUrls = (options) => {
    const hash = calcHash(options);
    const baseUrl = options.cssFontsUrl && options.cssFontsUrl.replace(/\\/g, '/');
    const urls = options.types.map((type) => {
        const fontName = `${ options.fontName }.${ type }?${ hash }`;
        return baseUrl ? urlJoin(baseUrl, fontName) : fontName;
    });

    return ObjectfromValues(options.types, urls);
};

const makeSrc = (options, urls) => {
    const templates = {
        eot: ({ url }) => `url("${ url }?#iefix") format("embedded-opentype")`,
        woff2: ({ url }) => `url("${ url }") format("woff2")`,
        woff: ({ url }) => `url("${ url }") format("woff")`,
        ttf: ({ url }) => `url("${ url }") format("truetype")`,
        svg: ({ url, fontName }) => `url("${ url }#${ fontName }") format("svg")`,
    };

    // Order used types according to 'options.order'.
    const orderedTypes = options.order.filter((type) => options.types.includes(type));

    return orderedTypes.map((type) => templates[type]({
        url: urls[type],
        fontName: options.fontName,
    })).join(',\n');
};

const makeContext = (options, urls) => ({
    fontName: options.fontName,
    src: makeSrc(options, urls),
    codepoints: transformCodepoints(options.codepoints),
    ...options.templateOptions,
});

const renderCss = (options, urls) => {
    let theUrls = urls;

    if (typeof urls === 'undefined') {
        theUrls = makeUrls(options);
    }

    const ctx = makeContext(options, theUrls);
    const source = fs.readFileSync(options.cssTemplate, 'utf8');
    const template = handlebars.compile(source);
    return template(ctx);
};

export default renderCss;
