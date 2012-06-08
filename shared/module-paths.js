/**
 * @overview: Hash map of shared modules and the location where they are
 *            provided.
 *
 * The MODULE_PATHS maps module names to the relative paths of the files which
 * provide them.  This map is used to resolve dependencies listed in define()
 * calls.
 */
var MODULE_PATHS = MODULE_PATHS || {};
MODULE_PATHS['Class'] = 'shared/class';               // Mutates global namespace
MODULE_PATHS['jquery'] = 'shared/jquery-1.7.2';       // Mutates global namespace
MODULE_PATHS['jqueryui'] = 'shared/jquery-ui-1.8.18'; // Mutates jquery
MODULE_PATHS['PubSub'] = 'shared/pubsub';
MODULE_PATHS['RepositoryBrowser'] = 'shared/repository-browser';
