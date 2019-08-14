import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';

import generateFonts from './generateFonts';
import renderCss from './renderCss';
import renderHtml from './renderHtml';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const TEMPLATES = {
    css: path.join(TEMPLATES_DIR, 'css.hbs'),
    scss: path.join(TEMPLATES_DIR, 'scss.hbs'),
    html: path.join(TEMPLATES_DIR, 'html.hbs'),
};

const DEFAULT_TEMPLATE_OPTIONS = {
    baseSelector: '.icon',
    classPrefix: 'icon-',
};

const DEFAULT_OPTIONS = {
    writeFiles: true,
    fontName: 'iconfont',
    css: true,
    cssTemplate: TEMPLATES.css,
    html: false,
    htmlTemplate: TEMPLATES.html,
    types: ['eot', 'woff', 'woff2'],
    order: ['eot', 'woff2', 'woff', 'ttf', 'svg'],
    rename: file => path.basename(file, path.extname(file)),
    formatOptions: {},
    /**
     * Unicode Private Use Area start.
     * http://en.wikipedia.org/wiki/Private_Use_(Unicode)
     */
    startCodepoint: 0xF101,
    normalize: true,
};

const validateOptions = (options) => {
    const validatedOptions = { ...options };

    if (options.dest === undefined) {
        throw new Error('"options.dest" is undefined.');
    }

    if (options.files === undefined) {
        throw new Error('"options.files" is undefined.');
    }

    if (!options.files.length) {
        throw new Error('"options.files" is empty.');
    }

    if (options.codepoints === undefined) {
        validatedOptions.codepoints = {};
    }

    if (options.cssDest === undefined) {
        validatedOptions.cssDest = path.join(options.dest, options.fontName + '.css');
    }

    if (options.htmlDest === undefined) {
        validatedOptions.htmlDest = path.join(options.dest, options.fontName + '.html');
    }

    return validatedOptions;
};

const getCodepoints = (options) => {
    // Generates codepoints starting from `options.startCodepoint`,
    // skipping codepoints explicitly specified in `options.codepoints`
    const codepointsValues = Object.values(options.codepoints);
    let currentCodepoint = options.startCodepoint;

    const getNextCodepoint = () => {
        while (codepointsValues.includes(currentCodepoint)) {
            currentCodepoint++;
        }

        const res = currentCodepoint;
        currentCodepoint++;

        return res;
    };

    const newCodepoints = {};
    options.names.forEach((name) => {
        if (!options.codepoints[name]) {
            newCodepoints[name] = getNextCodepoint();
        }
    });

    return {
        ...newCodepoints,
        ...options.codepoints,
    };
};

const getNames = (userOptions) => userOptions.files.map(userOptions.rename);

const assignDefaultOptions = (options) => Object.assign({}, DEFAULT_OPTIONS, options);

const checkDeprecatedOptions = (options) => {
    const checkedOptions = {
        ...options,
    };

    if (options.cssFontsPath) {
        console.log('Option "cssFontsPath" is deprecated. Use "cssFontsUrl" instead.');
        checkedOptions.cssFontsUrl = options.cssFontsPath;
    }

    // Warn about using deprecated template options.
    for (const key in options.templateOptions) {
        const value = options.templateOptions[key];
        if (key === "baseClass") {
            console.warn("[webfont-generator] Using deprecated templateOptions 'baseClass'. Use 'baseSelector' instead.");
            checkedOptions.templateOptions.baseSelector = "." + value;
            break;
        }
    }

    return checkedOptions;
};

const webfont = (userOptions) => {
    const normalizedOptions = checkDeprecatedOptions(userOptions);
    const options = validateOptions(assignDefaultOptions(normalizedOptions));

    // We modify codepoints later, so we can't use same object from default options.
    options.names = getNames(options);


    options.templateOptions = Object.assign({}, DEFAULT_TEMPLATE_OPTIONS, options.templateOptions);

    options.codepoints = getCodepoints(options);

    return generateFonts(options)
        .then((result) => {
            if (options.writeFiles) {
                writeResult(result, options);
            }

            result.getCodepoints = () => options.codepoints;
            result.generateCss = (urls) => renderCss(options, urls);

            return result;
        });
};

const writeFile = (content, dest) => {
    mkdirp.sync(path.dirname(dest));
    fs.writeFileSync(dest, content);
};

const writeResult = (fonts, options) => {
    Object.entries(fonts).forEach(([type, content]) => {
        var filepath = path.join(options.dest, options.fontName + '.' + type);

        writeFile(content, filepath);
    });

    if (options.css) {
        const css = renderCss(options);
        writeFile(css, options.cssDest);
    }

    if (options.html) {
        const html = renderHtml(options);
        writeFile(html, options.htmlDest);
    }
};

webfont.templates = TEMPLATES;

export default webfont;
