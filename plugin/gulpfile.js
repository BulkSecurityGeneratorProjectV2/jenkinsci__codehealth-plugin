var builder = require('jenkins-js-builder');

//builder.defineTasks(['test','bundle','rebundle', 'jshint']);

builder.bundle('src/main/js/codehealth.js')
    .withExternalModuleMapping('jquery-detached', 'jquery-detached:jquery2')
    .withExternalModuleMapping('bootstrap-detached', 'bootstrap:bootstrap3')
    .withExternalModuleMapping('handlebars', 'handlebars:handlebars3')
    .inDir('src/main/webapp/bundles');


