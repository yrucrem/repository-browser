/*!--------------------------------------*
  | Gentics Software GmbH                |
  +--------------------------------------+
  | Aloha.Browser                        |
  +--------------------------------------+
  | browser.js                           |
  *--------------------------------------*/

/**
 * Aloha.Browser
 *
 * The browser is an interface to interact with a Repository Managers.
 *
 * Reference:
 *		www.aloha-editor.org/wiki/Repository
 * 3rd party tools:
 *		www.jstree.com/documentation/core
 *		www.trirand.com/blog/ (jqGrid)
 *		layout.jquery-dev.net/
 */
(function (window, undefined) {
	
	'use strict';
	
	var  GENTICS = window.GENTICS || (window.GENTICS = {}),
		  jQuery = window.gQuery  ||  window.jQuery,
		   Aloha = GENTICS.Aloha;
	
	// If jQuery cannot be found then die violently!
	if (typeof jQuery != 'function') {
		throw 'jQuery cannot be found.';
		return;
	}
	
	// Create local reference for quicker look-up
	var console = window.console;
	if (typeof console == typeof undefined) {
		console = {
			log   : function () {},
			warn  : function () {},
			error : function () {}
		};
	}
	
	var uid = +(new Date);
	
	// If you will extend Browser please be careful of how prototype inheritance
	// works. Instance properties *must* be here in the constructor function, and
	// static properties in Browser's prototype object. :-)
	var Browser = function (opts) {
		// Force the Browser function to be invoked with the "new" operator
		if (typeof this.instanceOf != 'string') {
			return new Browser(opts);
		}
		
		var that = this;
		// Defaults
		var options = jQuery.extend({
			// Set to TRUE for development and debugging
			verbose: false,
			// The repository manager which this browser will interface with
			repositoryManager: Aloha.RepositoryManager,
			objectTypeFilter: [],
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
		}, opts || {});
		
		if (typeof options.element != 'object') {
			options.element = this.createOverlay();
		}
		
		// Hash to store callbacks functions for each instance of browser
		this._callbacks = {};
		// Cache of repository objects
		this._objs = {};
		this._searchQuery = null;
		this._pagingOffset = 0;
		// Total number of objects in a given folder *don't* use null isNaN(null) == false!
		this._pagingCount = undefined;
		this._pagingBtns = {
			first : null,
			end	  : null,
			next  : null,
			prev  : null
		};
		
		// Register user defined implement methods and callbacks, and remove
		// them from the options object
		if (typeof options.implement == 'object') {
			jQuery.each(options.implement, function (k, v) {
				that[k] = v;
			});
			options.implement = undefined;
		}
		
		if (typeof options.callbacks == 'object') {
			jQuery.each(options.callbacks, function () {
				that.callback(this[0], this[1]);
			});
			options.callbacks = undefined;
		}
		
		// Now that we have removed implement and callbacks, we insert
		// the remaining options as properties of this object
		jQuery.extend(this, options);
		
		this.init.apply(this, arguments);
	};
	
	/**
	 * All methods and properties that are to be shared across multiple
	 * instances of Browser are extended into the prototype object
	 */
	jQuery.extend(Browser.prototype, {
		
		instanceOf: 'Aloha.Browser',
		
		// ui components
		grid: null,
		tree: null,
		list: null,
		
		/**
		 * Called by Browser constructor function
		 *
		 * @param Mixed selector - jQuery selector. May be String, DOMObject,
		 *						   or jQuery itself
		 */
		init: function () {
			var that = this,
				tree_width = this.treeWidth,
				give = tree_width / 5;
			
			this.preloadImages();
			
			this.uid = ++uid;
			
			this.element.attr('data-aloha-browser', this.uid).html('');
			
			this.grid = this.createGrid(this.element);
			this.tree = this.createTree(this.grid.find('.ui-layout-west'));
			this.list = this.createList(this.grid.find('.ui-layout-center'));
			
			this.grid.layout({
				west__size	  : tree_width - 1,
				west__minSize : tree_width - give,
				west__maxSize : tree_width + give,
				center__size  : this.listWidth,
				paneClass	  : 'ui-layout-pane',
				resizerClass  : 'ui-layout-resizer',
				togglerClass  : 'ui-layout-toggler',
				onresize	  : function (name, element) {
					if (name == 'center') {
						that.list.setGridWidth(element.width());
					}
				}
				// , applyDefaultStyles: true // debugging
			}).sizePane('west', tree_width); // This is a fix for a ui-layout bug in chrome
			
			this.preventSelection();
			
			this.close();
		},
		
		preventSelection: function () {
			this.grid
				.attr('unselectable', 'on')
				.css('-moz-user-select', 'none')
				.each(function() {
					this.onselectstart = function() {
						return false;
					};
				});
		},
		
		preloadImages: function () {
			var that = this;
			jQuery.each([
				'arrow-000-medium.png',
				'arrow-180.png',
				'arrow-315-medium.png',
				'arrow-stop-180.png',
				'arrow-stop.png',
				'arrow.png',
				'control-stop-square-small.png',
				'folder-horizontal-open.png',
				'folder-open.png',
				'magnifier-left.png',
				'page.png',
				'picture.png',
				'sort-alphabet-descending.png',
				'sort-alphabet.png'
			], function () {(new Image()).src = that.rootPath + '/img/' + this;});
		},
		
		/**
		 * TODO: Is there a way we can prevent potential infinite loops caused
		 * by programmer error?
		 *
		 * @param String fn - Name of any Browser method
		 */
		trigger: function (fn, returned) {
			var cb = this._callbacks,
				i, l,
				func = cb[fn];
			
			if (typeof func == 'object') {
				for (i = 0, l = func.length; i < l; i++) {
					if (typeof func[i] == 'function') {
						func[i].call(this, returned);
					}
				}
			}
		},
		
		/**
		 * Handles the binding of callbacks to any method in the browser.
		 * Removes the necessity for functions to manually trigger callbacks
		 * events within themselves by wrapping them within an function that
		 * does it on their behalf when necessary.
		 * A user can simply do the following:
		 *		browser.callback('anyFunction', function () { alert('called back'); });
		 * This will work regardless of whether browser.anyFunction manually
		 * triggers any events.
		 *
		 * this.enableCallbacks actually does most of the heavy lifting.
		 *
		 * @param String fn - Name of any browser method
		 * @param Object cb - Callback function to invoke
		 */
		callback: function (fn, cb) {
			if (typeof this[fn] == 'function') {
				if (typeof cb == 'function') {
					if (this._callbacks[fn] == undefined) {
						if (this.enableCallbacks(fn)) {
							this._callbacks[fn] = [cb];
						}
					} else {
						this._callbacks[fn].push(cb);
					}
				} else {
					this.warn(
						'Unable to add a callback to "' + fn + '" because '	+
						'the callback object that was given is of type "'	+
						(typeof cb) + '". '									+
						'The callback object needs to be of type "function".'
					);
				}
			} else {
				this.warn(
					'Unable to add a callback to "' + fn +
					'" because it is not a method in Aloha.Browser.'
				);
			}
			
			return this;
		},
		
		/**
		 * Work-horse for this.callback method
		 */
		enableCallbacks: function (fn) {
			var browser_inst = this,
				func = this[fn];
			if (typeof func == 'function') {
				this[fn] = function () {
					var returned = func.apply(browser_inst, arguments);
					browser_inst.trigger.call(browser_inst, fn, returned);
					return returned;
				};
				
				return true;
			} else {
				this.warn(
					'Cannot enable callbacks for function "' + fn +
					'" because no such method was found in Aloha.Browser.'
				);
				
				return false;
			}
		},
		
		getRepoChildren: function (params, callback) {
			var that = this;
			this.repositoryManager.getChildren(params, function (items) {
				that.processRepoResponse(items, callback);
			});
		},
		
		queryRepository: function (params, callback) {
			var that = this;
			this.repositoryManager.query(params, function (response) {
				var data = (response.results > 0) ? response.items : [];
				that.processRepoResponse(data, callback);
			});
		},
		
		processRepoResponse: function (items, callback) {
			var that = this,
				data = [];
			
			jQuery.each(items, function () {
				data.push(that.harvestRepoObject(this));
			});
			
			if (typeof callback == 'function') {
				callback.call(this, data);
			}
		},
		
		/**
		 * Convert a repository object into an object that can be used with our
		 * tree component. Also add a reference to this object in our objs hash.
		 * According to the Repository specification, each object will at least
		 * have the following properties at least: id, name, url, and type. Any
		 * and all other attributes are optional.
		 */
		harvestRepoObject: function (obj) {
			uid++;
			
			var repo_obj = this._objs[uid] = jQuery.extend(obj, {
				uid: uid,
				loaded: false
			});
			
			return this.processRepoObject(repo_obj);
		},
		
		/**
		 * Should return an object that is usable with your tree component
		 */
		processRepoObject: function (obj) {
			var icon = '';
			
			switch (obj.baseType) {
			case 'folder':
				icon = 'folder';
				break;
			case 'document':
				icon = 'document';
				break;
			}
			
			return {
				data: {
					title : obj.name, 
					attr  : {'data-rep-oobj': obj.uid}, 
					icon  : icon
				},
				state: (obj.hasMoreItems || obj.baseType == 'folder')
							? 'closed' : null,
				resource: obj
			};
		},
		
		fetchRepoRoot: function (callback) {
			this.getRepoChildren(
				{inFolderId: this.rootFolderId},
				function (data) {
					if (typeof callback == 'function') {
						callback(data);
					}
				}
			);
		},
		
		/**
		 * User should implement this according to their needs
		 * @param Object item - Repository resource for a row
		 */
		renderRowCols: function (item) {
			var obj = {};
			
			jQuery.each(this.columns, function (k, v) {
				switch (k) {
				case 'icon':
					obj[k] = '<div class="aloha-browser-icon\
								aloha-browser-icon-' + item.type + '"></div>';
					break;
				default:
					obj[k] = item[k] || '--';
				}
			});
			
			return obj;
		},
		
		/**
		 * User should implement this according to their needs
		 * @param Object item - Repository resource for a row
		 */
		onSelect: function (item) {},
		
		/**
		 * Fetch an object's  children if we haven't already done so
		 */
		fetchChildren: function (obj, callback) {
			var that = this;
			
			if (obj.hasMoreItems == true || obj.baseType == 'folder') {
				if (obj.loaded == false) {
					this.getRepoChildren(
						{
							inFolderId   : obj.id,
							repositoryId : obj.repositoryId
						},
						function (data) {
							that._objs[obj.uid].loaded = true;
							
							if (typeof callback == 'function') {
								callback(data);
							}
						}
					);
				}
			}
		},
		
		getObjectFromCache: function (node) {
			var uid,
				obj;
			
			if (typeof node == 'object') {
				uid = node.find('a:first').attr('data-rep-oobj');
				obj = this._objs[uid];
			}
			
			return obj;
		},
		
		rowClicked: function (event) {
			var row = jQuery(event.target).parent('tr'),
				item = null,
				uid;
			
			if (row.length > 0) {
				uid = row.attr('id');
				item = this._objs[uid];
				this.onSelect(item);
				this.close();
			}
			
			return item;
		},
		
		createTree: function (container) {
			var that = this,
				tree = jQuery('<div class="aloha-browser-tree"></div>'),
				header =  jQuery('\
					<div class="aloha-browser-tree-header aloha-browser-grab-handle">\
						Repository Browser\
					</div>\
				');
			
			container.append(header, tree);
			
			tree.height(this.grid.height() - header.outerHeight(true))
				.bind('before.jstree', function (event, data) {
					//console.log(data.func);
				})
				.bind('loaded.jstree', function (event, data) {
					jQuery('>ul>li', this).first().css('padding-top', 5);
				})
				.bind('select_node.jstree', function (event, data) {
					var node = data.rslt.obj,
						obj = that.getObjectFromCache(node);
					
					// Fix for what seems to be a bug with jsTree
					if (data.args[0].context) {return;}
					
					if (typeof obj == 'object') {
						that._pagingOffset = 0;
						that._searchQuery = null;
						that.fetchItems(obj, that.processItems);
					}
				})
				.jstree({
					plugins: ['themes', 'json_data', 'ui'],
					core: {
						// TODO: Override the standard animation by
						// setting this to 0, hiding the child node and
						// re-animating it in our own way
						animation: 250
					},
					themes: {
						theme : 'browser',
						url   : that.rootPath + '/css/jstree.css',
						dots  : true,
						icons : true
					},
					json_data: {
						data: function (/* node, callback */) {
							that.fetchSubnodes.apply(that, arguments);
						},
						correct_state: true
					},
					ui: {select_limit: 1}
				});
			
			return tree;
		},
		
		createGrid: function (container) {
			var grid = jQuery('\
				<div class="aloha-browser-grid aloha-browser-shadow aloha-browser-rounded-top">\
					<div class="ui-layout-west"></div>\
					<div class="ui-layout-center"></div>\
				</div>\
			');
			
			container.append(grid);
			
			return grid;
		},
		
		createList: function (container) {
			var that = this,
				list = jQuery('<table id="jqgrid_needs_somethig_anything_here"\
					class="aloha-browser-list"></table>'),
				colNames = [''],
				colModel = [{ // This is a hidden utility column to help us with auto sorting
					name	 : 'id',
					sorttype : 'int',
					firstsortorder: 'asc',
					hidden	 : true
				}];
			
			jQuery.each(this.columns, function (k, v) {
				colNames.push(v.title);
				colModel.push({
					name	  : k,
					width	  : v.width,
					sortable  : v.sortable,
					sorttype  : v.sorttype,
					resizable : v.resizable
				});
			});
			
			container.append(
				list,
				jQuery('<div id="aloha-browser-list-pager">')
			);
			
			list.jqGrid({
				datatype	: 'local',
				width		: container.width(),
				shrinkToFit	: true,
				colNames	: colNames,
				colModel	: colModel,
				caption		: '&nbsp;',
				altRows		: true,
				altclass	: 'aloha-browser-list-altrow',
				resizeclass : 'aloha-browser-list-resizable',
				pager		: '#aloha-browser-list-pager', // http://www.trirand.com/jqgridwiki/doku.php?id=wiki:pager&s[]=pager
			//	rowNum		: this.pageSize,	  // # of records to view in the grid. Passed as parameter to url when retrieving data from server
				viewrecords	: true,
				// Event handlers: http://www.trirand.com/jqgridwiki/doku.php?id=wiki:events
				// fires after click on [page button] and before populating the data
				onPaging	: function (button) {},
				// called if the request fails
				loadError	 : function (xhr, status, error) {},
				// Raised immediately after row was double clicked. 
				ondblClickRow: function (rowid, iRow, iCol, e) {},
				// fires after all the data is loaded into the grid and all other processes are complete
				gridComplete : function () {},
				// executed immediately after every server request 
				loadComplete : function (data) {}
			});
			
			container.find('.ui-jqgrid-bdiv').css(
				'height',
				this.grid.height() - (
					container.find('.ui-jqgrid-titlebar').outerHeight(true) +
					container.find('.ui-jqgrid-hdiv').outerHeight(true) + 
					container.find('.ui-jqgrid-pager').outerHeight(true)
				)
			)
			
			list.dblclick(function () {
				that.rowClicked.apply(that, arguments);
			});
			
			// Override jqGrid pageing
			container.find('.ui-pg-button').unbind().find('>span.ui-icon').each(function () {
				var dir = this.className.match(/ui\-icon\-seek\-([a-z]+)/)[1];
				
				that._pagingBtns[dir] = jQuery(this).parent()
					.addClass('ui-state-disabled')
					.click(function () {
						if (!jQuery(this).hasClass('ui-state-disabled')) {
							that.doPaging(dir);
						}
					});
			});
			
			// TODO: implement this once repositories can handle it, hidding it for now
			container.find('.ui-pg-input').parent().hide()
			container.find('.ui-separator').parent().css('opacity', 0).first().hide();
			container.find('#aloha-browser-list-pager_left').hide();
			
			this.createTitlebar(container);
			
			this.grid.find('.loading').html(
				//'Loading...'
			);
			
			return list;
		},
		
		createTitlebar: function (container) {
			var that = this,
				search,
				bar = container.find('.ui-jqgrid-titlebar'),
				btns = jQuery('														\
					<div class="aloha-browser-btns">								\
						<input type="text" class="aloha-browser-search-field" />	\
						<span class="aloha-browser-btn aloha-browser-search-btn">	\
							<span class="aloha-browser-search-icon"></span>			\
						</span>														\
						<span class="aloha-browser-btn aloha-browser-close-btn">	\
							Close													\
						</span>														\
						<div class="aloha-browser-clear"></div>						\
					</div>															\
				');
			
			bar.addClass('aloha-browser-grab-handle')
			   .append(btns);
			
			bar.find('.aloha-browser-search-btn').click(function () {
				that.triggerSearch();
			});
			bar.find('.aloha-browser-search-field').keypress(function (event) {
				if (event.keyCode == 13) { // on Enter
					that.triggerSearch();
				}
			});
			bar.find('.aloha-browser-close-btn').click(function () {
				that.close();
			});
			bar.find('.aloha-browser-btn').mousedown(function () {
				jQuery(this).addClass('aloha-browser-pressed');
			}).mouseup(function () {
				jQuery(this).removeClass('aloha-browser-pressed');
			});
		},
		
		triggerSearch: function () {
			var search = this.grid.find('input.aloha-browser-search-field'),
				val = search.val();
			
			this._pagingOffset = 0;
			
			if (val == '') {
				search.focus();
			} else {
				this._searchQuery = val;
				this.fetchItems(this.currentFolder, this.processItems);
			}
		},
		
		doPaging: function (dir) {
			switch (dir) {
			case 'first':
				this._pagingOffset = 0;
				break;
			case 'end':
				this._pagingOffset = this._pagingCount - this.pageSize;
				break;
			case 'next':
				this._pagingOffset += this.pageSize;
				break;
			case 'prev':
				this._pagingOffset -= this.pageSize;
				break;
			}
			this.fetchItems(this._currentFolderId, this.processItems);
		},
		
		fetchItems: function (obj, callback) {
			var that = this,
				name;
			
			switch (typeof obj) {
			case 'object':
				this._currentFolderId =  obj.id;
				name = obj.name;
				break;
			case 'string':
				name = this._currentFolderId = obj;
				break;
			default:
				name = this._currentFolderId = this.rootFolderId;
			}
			
			this.list.setCaption(
				(typeof this._searchQuery == 'string')
					? 'Searching for "' + this._searchQuery + '" in ' + name
					: 'Browsing: ' + name
			);
			
			this.list.fadeOut(250);
			this.grid.find('.loading').fadeIn(500);
			
			this.queryRepository(
				{
					queryString		 : this._searchQuery || null,
					inFolderId		 : this._currentFolderId,
					skipCount		 : this._pagingOffset,
					maxItems		 : this.pageSize,
					objectTypeFilter : this.objectTypeFilter || null,
					renditionFilter	 : this.renditionFilter || null,
					filter			 : null, // array
					orderBy			 : null  // eg: [{lastModificationDate:?DESC?, name:?ASC?}]
				//	repositoryId	 : obj.repositoryId
				},
				function (data) {
					if (typeof callback == 'function') {
						callback.call(that, data);
					}
				}
			);
		},
		
		fetchSubnodes: function (node, callback) {
			if (node === -1) {
				this.fetchRepoRoot(callback);
			} else {
				var obj = this.getObjectFromCache(node);
				if (typeof obj == 'object') {
					this.fetchChildren(obj, callback);
				}
			}
		},
		
		listItems: function (items) {
			var that = this,
				data = [],			
				list = this.list.clearGridData(),
				obj;
			
			jQuery.each(items, function () {
				obj = this.resource;
				list.addRowData(
					obj.uid,
					jQuery.extend({id: obj.id}, that.renderRowCols(obj))
				);
			});
			
			list.sortGrid('id');
		},
		
		processItems: function (data) {
			var btns = this._pagingBtns,
				disabled = 'ui-state-disabled';
			
			this.grid.find('.loading').fadeOut(250);
			this.list.fadeIn(250);
			
			this.listItems(data);
			
			if (this._pagingOffset <= 0) {
				btns.first.add(btns.prev).addClass();
			} else {
				btns.first.add(btns.prev).removeClass(disabled);
			}
			
			if (isNaN(this._pagingCount)) {
				btns.end.addClass(disabled);
				if (data.length == 0) {
					btns.next.addClass(disabled);
				} else {
					btns.next.removeClass(disabled);
				}
			} else if (this._pagingOffset + this.pageSize >= this._pagingCount) {
				btns.end.add(btns.next).addClass(disabled);
			} else {
				btns.end.add(btns.next).removeClass(disabled);
			}
			
			this.grid.find('.ui-paging-info').html(
				'Viewing ' + (data.length == 0 ? 0 :(this._pagingOffset + 1)) + ' - '  +
				(this._pagingOffset + data.length) + ' of ' +
				(this._pagingCount || 'numerous')
			);
		},
		
		createOverlay: function () {
			var that = this;
			
			jQuery('body').append(
				'<div class="aloha-browser-modal-overlay" style="top:-9999px; z-index: 999999;"></div>' +
				'<div class="aloha-browser-modal-window"  style="top:-9999px; z-index: 999999;"></div>'
			);
			
			jQuery('.aloha-browser-modal-overlay').click(function () {
				that.close();
			});
			
			return jQuery('.aloha-browser-modal-window');
		},
		
		setObjectTypeFilter: function (otf) {
			this.objectTypeFilter = otf;
		},
		
		getObjectTypeFilter: function () {
			return this.objectTypeFilter;
		},
		
		show: function () {
			var el = this.element;
			
			jQuery('.aloha-browser-modal-overlay')
				.css({top: 0, left: 0})
				.add(el).stop().show();
			
			var	w = el.width(),
				h = el.height(),
				win	= jQuery(window);
			
			el.css({
				left : (win.width() - w) / 2,
				top  : (win.height() - h) / 3
			}).draggable({
				handle: el.find('.aloha-browser-grab-handle')
			}).resizable();
			
			// Do wake-up animation
			this.grid.css({
				marginTop: 30,
				opacity: 0
			}).animate({
				marginTop: 0,
				opacity: 1
			}, 1000, 'easeOutExpo');
		},
		
		close: function () {
			this.element.fadeOut(
				250, function () {
					jQuery(this).css('top', 0).hide();
					jQuery('.aloha-browser-modal-overlay').hide();
				}
			);
		},
		
		log: function (msg) {
			if (this.verbose == true) {
				console.log('%s LOG: ', this.instanceOf, msg);
			}
		},
		
		warn: function (msg, force) {
			if (this.verbose == true || force == true) {
				console.warn('%s WARNING: ', this.instanceOf, msg);
			}
		},
		
		error: function (msg, force) {
			if (this.verbose == true || force == true) {
				console.error('%s ERROR: ', this.instanceOf, msg);
			}
		}
		
	});
	
	GENTICS.Browser = Browser;
	
})(window);