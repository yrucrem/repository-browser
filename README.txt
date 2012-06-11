Browser README
--------------


Including dependencies:
-----------------------
You will need to include the following in the head of the page in which the browser will be used:

<script	src="../Browser/lib/jqueryui/jqueryui.js"></script>
<script	src="../Browser/lib/ui-layout/ui-layout.js"></script>
<script	src="../Browser/lib/jqgrid/grid.locale.en.js"></script>
<script	src="../Browser/lib/jqgrid/jquery.jqGrid.min.js"></script>
<script	src="../Browser/lib/jstree/jquery.jstree.js"></script>
<script	src="../Browser/browser.js"></script>

<link rel="stylesheet" href="../Browser/lib/jqgrid/ui.jqgrid.css" type="text/css">
<link rel="stylesheet" href="../Browser/lib/jqgrid/browser.jqgrid.css" type="text/css">
<link rel="stylesheet" href="../Browser/css/browser.css" type="text/css">

Of course you will need to modify the path to the Browser files as needed.


Invoking the browser:
---------------------
Invoking the browser should work in the same manner as is did before.
The difference is that the Browser is in the GENTICS namespace as opposed
to the Aloha namespace. Because of the way that the load sequence is currently
being done in branch 0.10, placing the Browser in the GENTICS object rather
than the Aloha object proved to be the most reliable way to include it as an
external component.

Showing the browser requires you to change one line of code in
Aloha-Editor/src/plugin/link/src/link.js:

this.browser = new GENTICS.Browser(); // instead of: new Aloha.ui.Browser()
this.browser.setObjectTypeFilter(Aloha.Link.objectTypeFilter);
this.browser.onSelect = function( item ) {
	// set href Value
	that.hrefField.setItem( item );
	// call hrefChange
	that.hrefChange();
};
// Repository is broken, disabling feature for now
this.repositoryButton = new Aloha.ui.Button({
	'iconClass' : 'aloha-button-big aloha-button-tree',
	'size' : 'large',
	'onclick' : function () {
		that.browser.show();
	},
	'tooltip' : this.i18n('button.addlink.tooltip'),
	'toggle' : false
});  

// COMMENT IN AND TEST THE BROWSER
Aloha.FloatingMenu.addButton(
	this.getUID('link'),
	this.repositoryButton,
	this.i18n('floatingmenu.tab.link'),
	1
);


A more advanced invoking of the browser may look something like this:
---------------------------------------------------------------------
var browser = new GENTICS.Browser({
	// Set to TRUE for development and debugging
	verbose: false,
	// The repository manager which this browser will interface with
	repositoryManager: Aloha.RepositoryManager,
	objectTypeFilter: ['website'],
	renditionFilter: [],
	// DOMObject to which this instance of browser is bound to
	element: undefined,
	// root folder id
	rootFolderId: 'aloha',
	// root path to where Browser resources are located
	rootPath: '../../../Browser',
	treeWidth: 300,
	listWidth: 'auto',
	pageSize: 10,
	columns: {
		icon: {title: '',	  width: 30,  sortable: false, resizable: false},
		name: {title: 'Name', width: 250, sorttype: 'text'},
		url : {title: 'URL',  width: 450, sorttype: 'text'}
	}
});

// Each of the properties will overwrite the corresponding default value.
// All properties in the above object are optional.

// You can attach a callback to any Browser method by doing the following:
browser.callback('createGrid', function () {
	console.dir('method createdGrid was called and return this: ', arguments);
});

// You can override any Browser method by doing the following:
browser.renderRowCols = function (item) {
	console.dir(item);
	return {};
};

// Finally, show the browser
browser.show();


Image, and CSS paths:
---------------------
Depending on how you deploy the Browser, it may be necessary to update the
paths for css and image resources used in the browser.
If any files need changing in this regard, it will be one or more of following:
./Browser/browser.js (rootPath)
./Browser/lib/jqgrid/browser.jqgrid.css
./Browser/lib/jqueryui/jqueryui.js
./Browser/lib/jstree/jquery.jstree.js


Fixing the repositories:
------------------------
If you plan to use the current repositories in Aloha Editor, you will need to fix them.
I had made temporary work-arounds on my working copy so that I could build, and test the
browser.


Futher notes:
-------------
At the moment, none of the repositories have implemented the full basic features described
in www.aloha-editor.org/wiki/Repository, which is the reference I used in developing the
browser. Therefore, while searching, and paging work on the browser the data returned from
the repositories is not necessarily correct.

I presented the browser at the dev-con, and we've discussed various things about working with
repositories and how it can be improved. I will continue to make improvements to the browser
as we work in it throught-out the time here, and will be pushing my changes to dev.repository-browser.git
