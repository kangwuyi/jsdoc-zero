var expect                = require('expect.js'),
    path                  = require('path'),
    jsdoc_zero            = require('../lib/default'),
    _                     = require('underscore'),
    projectHomePath       = path.resolve('.'),
    defaultConfigFile     = require(path.resolve(__dirname, '../lib/default.json')),
    userDefinedConfigFile = require(path.resolve(__dirname, '../dox.config.json')),
    loadConfigFiled       = _.extend(defaultConfigFile, userDefinedConfigFile);


describe('bin/dox build', function () {
    /*
     var exec                  = require('child_process').exec;
     it('build default', function (done) {
     exec('node ' + __dirname + '/../bin/jdz build', function (err, stdout) {
     expect(err).not.to.be.ok();
     expect(stdout).to.be.ok();
     done();
     });
     });
     */
    it('test cover', function (done) {
        if (!_.isArray(loadConfigFiled.source.include)) loadConfigFiled.source.include = defaultConfigFile.source.include;
        if (!_.isArray(loadConfigFiled.source.exclude)) loadConfigFiled.source.exclude = defaultConfigFile.source.exclude;
        if (!_.isString(loadConfigFiled.source.output)) loadConfigFiled.source.output = defaultConfigFile.source.output;
        if (!_.isArray(loadConfigFiled.source.suffix)) loadConfigFiled.source.suffix = defaultConfigFile.source.suffix;
        loadConfigFiled.source.exclude  = _.map(loadConfigFiled.source.exclude, function (item) {
            return path.normalize(item);
        });
        loadConfigFiled.projectHomePath = projectHomePath;
        loadConfigFiled.source.output   = path.normalize(loadConfigFiled.source.output);
        expect(jsdoc_zero(loadConfigFiled)).to.equal(true);
        done();
    });
});
