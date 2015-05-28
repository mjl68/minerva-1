/**
 * Copyright 2015 Kitware Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function (grunt) {

    var fs = require('fs');
    var defaultTasks = [];

    // Since this is an external web app in a plugin,
    // it handles building itself
    //
    // It is not included in the plugins being built by virtue of
    // the web client not living in web_client, but rather web_external
    var configureMinerva = function () {
        var pluginName = "minerva";
        var pluginDir = "plugins/minerva";
        var staticDir = 'clients/web/static/built/plugins/' + pluginName;
        var sourceDir = "web_external";

        if (!fs.existsSync(staticDir)) {
            fs.mkdirSync(staticDir);
        }

        var jadeDir = pluginDir + '/' + sourceDir + '/templates';
        if (fs.existsSync(jadeDir)) {
            var files = {};
            files[staticDir + '/minerva_templates.js'] = [jadeDir + '/**/*.jade'];
            grunt.config.set('jade.' + pluginName, {
                files: files
            });
            grunt.config.set('jade.' + pluginName + '.options', {
                namespace: 'minerva.templates'
            });
            grunt.config.set('watch.jade_' + pluginName + '_app', {
                files: [jadeDir + '/**/*.jade'],
                tasks: ['jade:' + pluginName, 'uglify:' + pluginName]
            });
            defaultTasks.push('jade:' + pluginName);
        }

        var cssDir = pluginDir + '/' + sourceDir + '/stylesheets';
        if (fs.existsSync(cssDir)) {
            var files = {};
            files[staticDir + '/minerva.min.css'] = [cssDir + '/**/*.styl'];
            grunt.config.set('stylus.' + pluginName, {
                files: files
            });
            grunt.config.set('watch.stylus_' + pluginName + '_app', {
                files: [cssDir + '/**/*.styl'],
                tasks: ['stylus:' + pluginName]
            });
            defaultTasks.push('stylus:' + pluginName);
        }

        var jsDir = pluginDir + '/' + sourceDir + '/js';
        // depends on npm install being run locally in this plugin dir
        var geojsDir = pluginDir + '/node_modules/geojs';
        var geojsDistDir = geojsDir + '/dist/built';
        var extDir = jsDir + '/ext';
        if (fs.existsSync(jsDir)) {
            var files = {};
            // name this minerva.min.js instead of plugin.min.js
            // so that girder app won't load minerva, which
            // should only be loaded as a separate web app running as minerva
            files[staticDir + '/minerva.min.js'] = [
                jsDir + '/init.js',
                staticDir + '/minerva_templates.js',
                jsDir + '/minerva-version.js',
                jsDir + '/view.js',
                jsDir + '/app.js',
                jsDir + '/utilities.js',
                jsDir + '/models/**/*.js',
                jsDir + '/collections/**/*.js',
                jsDir + '/views/**/*.js'
            ];
            // since Girder already provides jquery and d3
            // don't take the prepackaged geo.ext.min.js from geojs, but rather
            // create one based on the other required dependencies
            files[staticDir + '/geo.ext.min.js'] = [
                geojsDir + '/bower_components/jquery-mousewheel/jquery-mousewheel.js',
                geojsDir + '/bower_components/gl-matrix/dist/gl-matrix.js',
                geojsDir + '/bower_components/proj4/dist/proj4-src.js',
                geojsDir + '/node_modules/pnltri/pnltri.js'
            ];
            files[staticDir + '/main.min.js'] = [
                jsDir + '/main.js'
            ];
            grunt.config.set('uglify.' + pluginName, {
                files: files
            });
            grunt.config.set('watch.js_' + pluginName + '_app', {
                files: [jsDir + '/**/*.js'],
                tasks: ['uglify:' + pluginName]
            });
            defaultTasks.push('uglify:' + pluginName);
        }

        var extraDir = pluginDir + '/' + sourceDir + '/extra';
        if (fs.existsSync(extraDir)) {
            var files = [
                { expand: true, cwd: extraDir, src: ['**'], dest: staticDir },
                { expand: true, cwd: geojsDistDir, src: ['geo.min.js'], dest: staticDir }
            ];
            grunt.config.set('copy.' + pluginName, { files: files});
            grunt.config.set('watch.copy_' + pluginName, {
                files: [extraDir + '/**/*', geojsDistDir + '/geo.min.js'],
                tasks: ['copy:' + pluginName]
            });
            defaultTasks.push('copy:' + pluginName);
        }
    };

    configureMinerva();
    grunt.registerTask('minerva-web', defaultTasks);
};
