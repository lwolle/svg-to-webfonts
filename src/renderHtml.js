import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import renderCss from './renderCss';

handlebars.registerHelper('removePeriods', (selector) => selector.replace(/\./, ''));

const renderHtml = (options) => {
    const source = fs.readFileSync(options.htmlTemplate, 'utf8');
    const template = handlebars.compile(source);

    const htmlFontsPath = path.relative(options.htmlDest, options.dest);
    // Styles embedded in the html file should use default CSS template and
    // have path to fonts that is relative to html file location.
    const styles = renderCss({
        ...options,
        cssFontPath: htmlFontsPath,
    });

    const ctx = {
        names: options.names,
        fontName: options.fontName,
        styles,
        ...options.templateOptions,
    };

    return template(ctx);
};

export default renderHtml;
