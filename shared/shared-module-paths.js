/**
 * @overview: Hash map of shared modules and the location where they are
 *            provided.
 *
 * The SHARED_MODULE_PATHS maps module names to the relative paths of the files
 * which provide them.  This map is used to resolve dependencies listed in
 * define() calls.
 */
var SHARED_MODULE_PATHS = {
	'Class'             : 'shared/class',              // Mutates global namespace
	'jquery'            : 'shared/jquery-1.7.2',       // Mutates global namespace
	'jqueryui'          : 'shared/jquery-ui-1.8.18',   // Mutates jquery
	'PubSub'            : 'shared/pubsub',
	'RepositoryBrowser' : 'shared/repository-browser',
	'jstree'            : 'vendor/jquery.jstree',      // Mutates jquery
	'jqgrid'            : 'vendor/jquery.jqgrid',      // Mutates jquery
	'jqgrid-locale-en'  : 'vendor/grid.locale.en',     // Mutates jqgrid
	'jquery-layout'     : 'vendor/jquery.layout'       // Mutates jquery
};
