/*global define: true */
define('DemoBrowser', ['RepositoryBrowser'], function (RepositoryBrowser) {
	'use strict';
	return RepositoryBrowser.extend({
		onSelect: function (item) {
			console.log(item);
		}
	});
});
