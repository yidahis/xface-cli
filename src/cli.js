/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

module.exports = function CLI(inputArgs) {
    var optimist  = require('optimist'),
        xface   = require('../xface');

   args = optimist(inputArgs)
        .boolean('d')
        .boolean('verbose')
        .boolean('v')
        .boolean('version')
        .boolean('silent')
        .argv;

    if (args.v || args.version) {
        return console.log(require('../package').version);
    }

    var tokens = inputArgs.slice(2),
        opts = {
            platforms: [],
            options: [],
            verbose: (args.d || args.verbose),
            silent: args.silent
        },
        cmd;

    // provide clean output on exceptions rather than dumping a stack trace
    process.on('uncaughtException', function(err){
        if (opts.verbose) {
            console.error(err.stack);
        } else {
            console.error(err);
        }
        process.exit(1);
    });
    xface.on('results', console.log);

    if (!opts.silent) {
        xface.on('log', console.log);
        xface.on('warn', console.warn);
        var plugman = require('xplugin');
        plugman.on('log', console.log);
        plugman.on('results', console.log);
        plugman.on('warn', console.warn);
    } else {
        // Remove the token.
        tokens.splice(tokens.indexOf('--silent'), 1);
    }


    if (opts.verbose) {
        // Add handlers for verbose logging.
        xface.on('verbose', console.log);
        require('xplugin').on('verbose', console.log);

        //Remove the corresponding token
        if(args.d && args.verbose) {
            tokens.splice(Math.min(tokens.indexOf("-d"), tokens.indexOf("--verbose")), 1);
        } else if (args.d) {
            tokens.splice(tokens.indexOf("-d"), 1);
        } else if (args.verbose) {
            tokens.splice(tokens.indexOf("--verbose"), 1);
        }
    }

    cmd = tokens && tokens.length ? tokens.splice(0,1) : undefined;
    if (cmd === undefined) {
        return xface.help();
    }

    if (cmd === "info") {
        return xface.info();
    }

    if (xface.hasOwnProperty(cmd)) {
        if (cmd == 'emulate' || cmd == 'build' || cmd == 'prepare' || cmd == 'compile' || cmd == 'run') {
            // Filter all non-platforms into options
            var platforms = require("../platforms");
            tokens.forEach(function(option, index) {
                if (platforms.hasOwnProperty(option)) {
                    opts.platforms.push(option);
                } else {
                    opts.options.push(option);
                }
            });
            xface.raw[cmd].call(this, opts).done();
        } else if (cmd == 'create' || cmd == 'serve') {
            xface.raw[cmd].apply(this, tokens).done();
        } else {
            // platform/plugins add/rm [target(s)]
            var invocation = tokens.slice(0,1); // this has the sub-command, i.e. "platform add" or "plugin rm"
            var targets = tokens.slice(1); // this should be an array of targets, be it platforms or plugins
            invocation.push(targets);
            xface.raw[cmd].apply(this, invocation).done();
        }
    } else {
        throw new Error('xFace does not know ' + cmd + '; try help for a list of all the available commands.');
    }
}
