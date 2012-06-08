/**
 * @overview: Hash map of shared modules and the location where they are
 *            provided.
 *
 * The MODULE_PATHS maps module names to the relative roots of the files which
 * provide them.  This map is used to resolve dependencies listed in define()
 * calls.
 */

var root = (typeof SETTINGS !== 'undefined' && SETTINGS.root) ? SETTINGS.root : '';
var MODULE_PATHS = (typeof MODULE_PATHS !== 'undefined') ? MODULE_PATHS : {};

MODULE_PATHS['Class'] = root + 'shared/class';               // Mutates global namespace
MODULE_PATHS['jquery'] = root + 'shared/jquery-1.7.2';       // Mutates global namespace
MODULE_PATHS['jqueryui'] = root + 'shared/jquery-ui-1.8.18'; // Mutates jquery
MODULE_PATHS['PubSub'] = root + 'shared/pubsub';
MODULE_PATHS['RepositoryBrowser'] = root + 'shared/repository-browser';
