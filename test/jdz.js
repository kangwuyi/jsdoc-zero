var exec   = require('child_process').exec;
var expect = require('expect.js');

describe('bin/dox build', function () {
    it('build default', function (done) {
        exec('node ' + __dirname + '/../bin/dox build', function (err, stdout) {
            expect(err).not.to.be.ok();
            expect(stdout).to.be.ok();
            done();
        });
    });
});
