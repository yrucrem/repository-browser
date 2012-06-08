var root = (typeof SETTINGS !== 'undefined' && SETTINGS.root) ? SETTINGS.root : '';
var MODULE_PATHS = (typeof MODULE_PATHS !== 'undefined') ? MODULE_PATHS : {};

MODULE_PATHS['jquery-layout'] = root + 'vendor/jquery.layout';     // Mutates jquery
MODULE_PATHS['jstree'] = root + 'vendor/jquery.jstree';            // Mutates jquery
MODULE_PATHS['jqgrid'] = root + 'vendor/jquery.jqgrid';            // Mutates jquery
MODULE_PATHS['jqgrid-locale-en'] = root + 'vendor/grid.locale.en'; // Mutates jqgrid
MODULE_PATHS['jqgrid-locale-de'] = root + 'vendor/grid.locale.de'; // Mutates jqgrid
MODULE_PATHS['repository-browser-i18n-en'] = root + 'nls/en/i18n';
MODULE_PATHS['repository-browser-i18n-de'] = root + 'nls/de/i18n';
