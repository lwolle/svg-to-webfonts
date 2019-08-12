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

const webfont = (options, done) => {
    if (options.cssFontsPath) {
        console.log('Option "cssFontsPath" is deprecated. Use "cssFontsUrl" instead.');
        options.cssFontsUrl = options.cssFontsPath;
    }

    options = Object.assign({}, DEFAULT_OPTIONS, options);

    if (options.dest === undefined) return done(new Error('"options.dest" is undefined.'));
    if (options.files === undefined) return done(new Error('"options.files" is undefined.'));
    if (!options.files.length) return done(new Error('"options.files" is empty.'));

    // We modify codepoints later, so we can't use same object from default options.
    if (options.codepoints === undefined) options.codepoints = {};

    options.names = options.files.map(options.rename);
    if (options.cssDest === undefined) {
        options.cssDest = path.join(options.dest, options.fontName + '.css');
    }
    if (options.htmlDest === undefined) {
        options.htmlDest = path.join(options.dest, options.fontName + '.html');
    }

    // Warn about using deprecated template options.
    for (const key in options.templateOptions) {
        const value = options.templateOptions[key];
        if (key === "baseClass") {
            console.warn("[webfont-generator] Using deprecated templateOptions 'baseClass'. Use 'baseSelector' instead.");
            options.templateOptions.baseSelector = "." + value;
            delete options.templateOptions.baseClass;
            break;
        }
    }

    options.templateOptions = Object.assign({}, DEFAULT_TEMPLATE_OPTIONS, options.templateOptions);

    // Generates codepoints starting from `options.startCodepoint`,
    // skipping codepoints explicitly specified in `options.codepoints`
    let currentCodepoint = options.startCodepoint;
    const codepointsValues = Object.values(options.codepoints);

    const getNextCodepoint = () => {
        while (codepointsValues.includes(currentCodepoint)) {
            currentCodepoint++;
        }

        const res = currentCodepoint;
        currentCodepoint++;

        return res;
    };

    options.names.forEach((name) => {
        if (!options.codepoints[name]) {
            options.codepoints[name] = getNextCodepoint();
        }
    });

    // TODO output
    generateFonts(options)
        .then((result) => {
            if (options.writeFiles) writeResult(result, options);

            result.generateCss = (urls) => {
                return renderCss(options, urls);
            };
            done(null, result);
        })
        .catch((err) => {
            done(err);
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

module.exports = webfont;
