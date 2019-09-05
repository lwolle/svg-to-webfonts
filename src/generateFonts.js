import fs from 'fs';
import Q from 'q';
import svgicons2svgfont from 'svgicons2svgfont';
import svg2ttf from 'svg2ttf';
import ttf2woff from 'ttf2woff';
import ttf2woff2 from 'ttf2woff2';
import ttf2eot from 'ttf2eot';
import { ObjectfromEntries } from './utils/object-from-entries';

/**
 * Generators for files of different font types.
 *
 * Generators have following properties:
 * [deps] {array.<string>} Names of font types that will be generated before current
 *        and passed to generator function.
 * fn {function(options, ...depsFonts, done)} Generator function with following arguments:
 *     options {object} Options passed to 'generateFonts' function.
 *     ...depsFonts Fonts listed in deps.
 *     done {function(err, font)} Callback that takes error or null and generated font.
 */
const generators = {
    svg: {
        deps: [],
        fn(options, done) {
            let font = Buffer.from([]);
            let svgOptions = {
                fontName: options.fontName,
                fontHeight: options.fontHeight,
                descent: options.descent,
                normalize: options.normalize,
                round: options.round,
            };

            if (options.formatOptions.svg) {
                svgOptions = {
                    ...svgOptions,
                    ...options.formatOptions.svg,
                };
            }

            svgOptions.log = () => {
            };

            const fontStream = svgicons2svgfont(svgOptions)
                .on('data', (data) => {
                    font = Buffer.concat([font, data]);
                })
                .on('end', () => {
                    done(null, font.toString());
                });

            options.files.forEach((file, idx) => {
                const glyph = fs.createReadStream(file);
                const name = options.names[idx];
                const unicode = String.fromCharCode(options.codepoints[name]);
                let ligature = '';

                Array.from(name).forEach((character, index) => {
                    ligature += String.fromCharCode(name.charCodeAt(index));
                });

                glyph.metadata = {
                    name,
                    unicode: [unicode, ligature],
                };
                fontStream.write(glyph);
            });

            fontStream.end();
        },
    },

    ttf: {
        deps: ['svg'],
        fn(options, svgFont, done) {
            let font = svg2ttf(svgFont, options.formatOptions.ttf);
            font = Buffer.from(font.buffer);
            done(null, font);
        },
    },

    woff: {
        deps: ['ttf'],
        fn(options, ttfFont, done) {
            let font = ttf2woff(new Uint8Array(ttfFont), options.formatOptions.woff);
            font = Buffer.from(font.buffer);
            done(null, font);
        },
    },

    woff2: {
        deps: ['ttf'],
        fn(options, ttfFont, done) {
            let font = ttf2woff2(new Uint8Array(ttfFont), options.formatOptions.woff2);
            font = Buffer.from(font.buffer);
            done(null, font);
        },
    },

    eot: {
        deps: ['ttf'],
        fn(options, ttfFont, done) {
            let font = ttf2eot(new Uint8Array(ttfFont), options.formatOptions.eot);
            font = Buffer.from(font.buffer);
            done(null, font);
        },
    },
};

const generateFonts = (options) => {
    const generatorTasks = {};

    const makeGeneratorTask = (type) => {
        if (generatorTasks[type]) {
            return generatorTasks[type];
        }

        const generator = generators[type];
        const dependencyTasks = generator.deps.map(makeGeneratorTask);

        const task = Promise.all(dependencyTasks).then((depsFonts) => {
            const args = [options].concat(depsFonts);
            return Q.nfapply(generator.fn, args);
        });

        generatorTasks[type] = task;

        return task;
    };

    options.types.forEach(makeGeneratorTask);

    const allPromises = Object.values(generatorTasks);
    const keys = Object.keys(generatorTasks);

    return Promise.all(allPromises).then((results) => {
        const entries = keys
            .map((key, index) => [key, results[index]]);

        return ObjectfromEntries(entries);
    });
};

export default generateFonts;
