var needle = require('needle');
const fs = require('fs-extra')

function stream_multiple(req, res, _urls, stream_dir, index = 0) {
    if (index == undefined) {
        index = 0;
        return stream_multiple(req, res, _urls, stream_dir, index);
    }

    let writeStream;
    const uri = _urls[index];

    writeStream = fs.createWriteStream(`${stream_dir}${index}.jpeg`);

    writeStream.on('close', () => {
        if (index >= _urls.length - 1) {
            res.redirect('/');
        } else {
            stream_multiple(req, res, _urls, stream_dir, index + 1);
        }
    });

    needle
        .get(uri)
        .pipe(writeStream)
        .on('done', () => {
            // stream finished
        });
}

module.exports = { stream_multiple }