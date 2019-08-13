var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var assert = require('assert');

var sass = require('node-sass');
var Q = require('q');
var readChunk = require('read-chunk');
var getFileType = require('file-type');

var webfontsGenerator = require('../src/index');

describe('webfont', function () {
    var SRC = path.join(__dirname, 'src');
    var DEST = path.join(__dirname, 'dest');

    var FILES = _.map(fs.readdirSync(SRC), function (file) {
        return path.join(SRC, file);
    });

    var TYPES = ['ttf', 'woff', 'woff2', 'eot', 'svg'];
    var FONT_NAME = 'fontName';

    var OPTIONS = {
        dest: DEST,
        files: FILES,
        fontName: FONT_NAME,
        types: TYPES,
    };

    afterEach(function () {
        var files = _.map(fs.readdirSync(DEST), function (file) {
            return path.join(DEST, file);
        });
        for (var i in files) fs.unlinkSync(files[i]);
    });

    it('generates all fonts and css files', async () => {
        const result = await webfontsGenerator(OPTIONS);
        const destFiles = fs.readdirSync(DEST);
        for (const i in TYPES) {
            const type = TYPES[i];
            const filename = FONT_NAME + '.' + type;
            const filepath = path.join(DEST, filename);
            assert(destFiles.indexOf(filename) !== -1, type + ' file exists');
            assert(fs.statSync(filepath).size > 0, type + ' file is not empty');

            const DETECTABLE = ['ttf', 'woff', 'woff2', 'eot'];
            if (_.contains(DETECTABLE, type)) {
                const chunk = readChunk.sync(filepath, 0, 262);
                const filetype = getFileType(chunk);
                assert.equal(type, filetype && filetype.ext, 'ttf filetype is correct');
            }
        }

        const cssFile = path.join(DEST, FONT_NAME + '.css');
        assert(fs.existsSync(cssFile), 'CSS file exists');
        assert(fs.statSync(cssFile).size > 0, 'CSS file is not empty');

        const htmlFile = path.join(DEST, FONT_NAME + '.html');
        assert(!fs.existsSync(htmlFile), 'HTML file does not exists by default');
    });

    describe('retuns object with', () => {
        it('fonts', async () => {
            const result = await webfontsGenerator(OPTIONS);
            assert(result.svg);
            assert(result.ttf);

        });

        it('function generateCss', async () => {
            const result = await webfontsGenerator(OPTIONS);

            assert.equal(typeof result.generateCss, 'function');

            const css = result.generateCss();

            assert.equal(typeof css, 'string');
        });

        it('function getCodepoints()', async () => {
            const expectedCodepoints = { back: 61697, close: 61698, triangleDown: 61699 };

            const result = await webfontsGenerator(OPTIONS);
            const codepoints = result.getCodepoints();
            assert.deepStrictEqual(codepoints, expectedCodepoints, 'codepoints are not equal');
        });

        it('function generateCss can change urls', async () => {
            const result = await webfontsGenerator(OPTIONS);
            const urls = { svg: 'AAA', ttf: 'BBB', woff: 'CCC', eot: 'DDD' };
            const css = result.generateCss(urls);
            assert(css.indexOf('AAA') !== -1);
        });
    });

    it('gives error when "dest" is undefined', async () => {
        const options = _.extend({}, OPTIONS, { dest: undefined });
        expect(() => webfontsGenerator(options)).toThrow('"options.dest" is undefined.');
    });

    it('gives error when "files" is undefined', async () => {
        var options = _.extend({}, OPTIONS, { files: undefined });
        expect(() => webfontsGenerator(options)).toThrow('"options.files" is undefined.');
    });

    it('uses codepoints and startCodepoint', async () => {
        var START_CODEPOINT = 0x40;
        var CODEPOINTS = {
            close: 0xFF,
        };
        var options = _.extend({}, OPTIONS, {
            codepoints: CODEPOINTS,
            startCodepoint: START_CODEPOINT,
        });

        await webfontsGenerator(options);

        var svg = fs.readFileSync(path.join(DEST, FONT_NAME + '.svg'), 'utf8');

        function codepointInSvg(cp) {
            return svg.indexOf(cp.toString(16).toUpperCase()) !== -1;
        }

        assert(codepointInSvg(START_CODEPOINT), 'startCodepoint used');
        assert(codepointInSvg(START_CODEPOINT + 1), 'startCodepoint incremented');
        assert(codepointInSvg(CODEPOINTS.close), 'codepoints used');

    });

    it('generates html file when options.html is true', async () => {
        const options = _.extend({}, OPTIONS, { html: true });

        await webfontsGenerator(options);

        const htmlFile = path.join(DEST, FONT_NAME + '.html');
        assert(fs.existsSync(htmlFile), 'HTML file exists');
        assert(fs.statSync(htmlFile).size > 0, 'HTML file is not empty');
    });

    describe('custom templates', function () {
        const TEMPLATE = path.join(__dirname, 'customTemplate.hbs');
        const TEMPLATE_OPTIONS = {
            option: 'TEST',
        };
        const RENDERED_TEMPLATE = 'custom template ' + TEMPLATE_OPTIONS.option + '\n';

        it('uses custom css template', async () => {
            var options = _.extend({}, OPTIONS, {
                cssTemplate: TEMPLATE,
                templateOptions: TEMPLATE_OPTIONS,
            });

            await webfontsGenerator(options);

            const cssFile = fs.readFileSync(path.join(DEST, FONT_NAME + '.css'), 'utf8');
            assert.equal(cssFile, RENDERED_TEMPLATE);
        });

        it('uses custom html template', async () => {
            var options = _.extend({}, OPTIONS, {
                html: true,
                htmlTemplate: TEMPLATE,
                templateOptions: TEMPLATE_OPTIONS,
            });

            await webfontsGenerator(options);
            const htmlFile = fs.readFileSync(path.join(DEST, FONT_NAME + '.html'), 'utf8');

            expect(htmlFile).toEqual(RENDERED_TEMPLATE);
        });
    });

    describe('scss template', function () {
        const TEST_SCSS_SINGLE = path.join(__dirname, 'scss', 'singleFont.scss');
        const TEST_SCSS_MULTIPLE = path.join(__dirname, 'scss', 'multipleFonts.scss');

        it('creates mixins that can be used to create icons styles', async () => {
            const DEST_CSS = path.join(DEST, FONT_NAME + '.scss');
            const options = _.extend({}, OPTIONS, {
                cssTemplate: webfontsGenerator.templates.scss,
                cssDest: DEST_CSS,
            });

            await webfontsGenerator(options);

            const rendered = sass.renderSync({
                file: TEST_SCSS_SINGLE,
            });
            const css = rendered.css.toString();

            assert(css.indexOf(FONT_NAME) !== -1);
        });

        it('multiple scss mixins can be used together', async () => {
            const FONT_NAME_2 = FONT_NAME + '2';
            const DEST_CSS = path.join(DEST, FONT_NAME + '.scss');
            const DEST_CSS_2 = path.join(DEST, FONT_NAME_2 + '.scss');

            const options1 = _.extend({}, OPTIONS, {
                cssTemplate: webfontsGenerator.templates.scss,
                cssDest: DEST_CSS,
                files: [path.join(SRC, 'close.svg')],
            });
            const options2 = _.extend({}, OPTIONS, {
                fontName: FONT_NAME_2,
                cssTemplate: webfontsGenerator.templates.scss,
                cssDest: DEST_CSS_2,
                files: [path.join(SRC, 'back.svg')],
            });

            const generate1 = await webfontsGenerator(options1);
            const generate2 = await webfontsGenerator(options2);

            const rendered = sass.renderSync({
                file: TEST_SCSS_MULTIPLE,
            });

            const css = rendered.css.toString();
            assert(css.indexOf(FONT_NAME) !== -1);
            assert(css.indexOf(FONT_NAME_2) !== -1);

        });
    });
});
