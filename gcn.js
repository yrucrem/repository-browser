/*!
 * Aloha Editor
 * Author & Copyright (c) 2010 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

(function (window, undefined) {
	
	'use strict'
	
	var GENTICS = window.GENTICS || (window.GENTICS = {}),
		 jQuery = window.alohaQuery || window.jQuery,
		  Aloha = window.Aloha;
	
	// What happends when aloha if fired?
	// Aloha-Editor is fully loaded?
	// What is core when alohacoreloaded is fired
	
	function createRepository () {
		/**
		 * Create the Repositories object. Namespace for Repositories
		 * @hide
		 */
		if (!Aloha.Repositories) {
			Aloha.Repositories = {};
		}
	};
	
	function initializeRepository () {
		
		var host = 'http://cms.soc-aacc.office',
			sid = '3184233YHA2po4L9qvtpr';
		
		jQuery.ajax({
			url: '/Aloha-Editor/Aloha-Editor-Browser/src/demo/browser/gcn_proxy.php?url='
				 + encodeURIComponent('http://cms.soc-aacc.office/.Node/?do=31&login=node&password=node'),
			error: function(data) {
			},
			success: function(data) {
				var json = JSON.parse(data);
				sid = json.sessionToken;
			}
		});
		
		function restURL (method) {
			var delim = method.match(/\?[^\=]+\=/) ? '&' : '?';
			var url = host + '/CNPortletapp/rest/' + method + delim + 'sid=' + sid;
			
			return '/Aloha-Editor/Aloha-Editor-Browser/src/demo/browser/gcn_proxy.php?url='
				+ encodeURIComponent(url);
		};
		
		/**
		 * register the plugin with unique name
		 */
		var repo = Aloha.Repositories.GCNRepo = new Aloha.Repository('GCNRepo');
		
		repo.init = function () {
			this.repositoryName = 'GCNRepo';
		};
		
		/**
		 * Convert orderBy from [{field: order} ...] to [{by:field, order:order} ...]
		 * for easier access in sort comparison function
		 */
		repo.buildSortPairs = function (orderBy) {
			if (orderBy == null) {
				return [];
			}
			
			var i = orderBy.length,
				sort,
				field,
				order,
				newOrder = [];
			
			while (i--) {
				sort = orderBy[i];
				for (field in sort) {
					order = sort[field];
					if (typeof order == 'string') {
						order = order.toLowerCase();
						if (order == 'asc' || order == 'desc') {
							newOrder[i] = {by: field, order: order};
							break;
						}
					}
				}
			}
			
			return newOrder;
		};
		
		/**
		 * Prepares filters patterns according to:
		 *		http://docs.oasis-open.org/cmis/CMIS/v1.0/cd04/cmis-spec-v1.0.html#_Ref237323310
		 * Examples:
		 *		*				(include all Renditions)
		 *		cmis:thumbnail	(include only Thumbnails)
		 *		Image/*			(include all image Renditions)
		 *		application/pdf, application/x-shockwave-flash
		 *						(include web ready Renditions)
		 *		cmis:none		(exclude all Renditions)
		 */
		repo.buildRenditionFilterChecks = function (filters) {
			var f,
			    pattern,
				type,
				subtype,
			    checks = [],
				i = filters.length;
			
			while (i--) {
				f = filters[i];
				
				if (f == '*') {
					// all renditions
					return ['*'];
				} else if (f.substring(0, 5) == 'cmis:') {
					pattern = f.substring(5, f.length);	
					
					// no renditions
					if (pattern == 'none') {
						return [];
					}
					
					// check against kind
					checks.push(['kind', pattern]);
				} else if (f.match(/([a-z0-9]+)\/([a-z0-9\*]+)/i)) {
					type = RegExp. $1;
					subtype = RegExp.$2;
					
					// check against mimeType
					checks.push([
						'mimeType',
						subtype == '*'
							? new RegExp(type + '\/.*', 'i')
							: f.toLowerCase()
					]);
				}
			}
			
			return checks;
		};
		
		/**
		 * Searches a repository for object items matching query if objectTypeFilter.
		 * If none found it returns null.
		 *
		 * TODO: implement cache
		 */
		repo.query = function (params, callback) {
			if (!params
					|| !params.objectTypeFilter
						|| jQuery.inArray('page', params.objectTypeFilter) == -1) {
				callback.call(this, []);
			}
			
			var that = this;
			
			var request = {
				url		 : restURL('folder/getPages/' + params.inFolderId + '?recursive=true&insync=true'),
				dataType : 'json',
				type	 : 'GET',
				error	 : function (data) {
					that.handleRestResponse(data);
					callback.call(that, []);
				},
				success	: function(data) {
					if (that.handleRestResponse(data)) {
						that.processQueryResults(data, params, callback);
					}
				}
			};
			
			jQuery.ajax(request);
		};
		
		repo.processQueryResults = function (data, params, callback) {
			var data = data.pages,
				skipCount = params.skipCount || 0,
				l = data.length,
				i = 0,
				num = 0,
				results = [],
				rgxp = new RegExp(params.queryString || '', 'i'),
				elem,
				obj;
			
			var hasQueryString = !!params.queryString,
			    hasFilter = !!params.filter,
			    hasRenditionFilter = false;
			
			if (params.renditionFilter && typeof params.renditionFilter === 'object') {
				hasRenditionFilter = params.renditionFilter.length > 0;
			}
			
			var contentSets = {
			
			};
			
			for (; i < l; i++) {
				elem = data[i];
				
				if ( !hasQueryString || elem.name.match(rgxp) || elem.url.match(rgxp) ) {
					if (skipCount) {
						skipCount--;
					} else {
						if (hasFilter) {
							// Copy all required fields
							obj = {
								id		 : elem.id,
								name	 : elem.name,
								baseType : 'document',	// TODO: could we use contentGroupId?
								type	 : 'page'
							};
							
							// Copy all requested fields
							for (var f = 0; f < params.filter.length; f++) {
								obj[params.filter[f]] = elem[params.filter[f]];
							}
						} else {
							obj = elem;
						}
						
						if (!contentSets[elem.contentSetId]) {
							contentSets[elem.contentSetId] = [];
							results[num++] = obj;
						}
						
						contentSets[elem.contentSetId].push(elem);
					}
				}
			};
			
			console.log(contentSets);
			
			var orderBy = this.buildSortPairs(params.orderBy);
			
			if (orderBy.length > 9999) {
				// Algorithm to sort entries based on order of each columns
				// importance as defined by order of sortorder-sortby pairs
				results.sort(function (a, b) {
					var i = 0,
						j = orderBy.length,
						sort;
					
					for (; i < j; i++) {
						sort = orderBy[i];
						
						if (a[sort.by] == b[sort.by]) {
							if (i == j - 1) {
								return 0;
							}
						} else {
							return (
								((sort.order == 'asc') ? 1 : -1)
									*
								((a[sort.by] < b[sort.by]) ? -1 : 1)
							);
						}
					}
				});
			}
			
			results = results.slice(0, params.maxItems || l);
			
			if (hasRenditionFilter && (i = results.length) && typeof _renditions != 'undefined') {
				var renditionChecks = this.buildRenditionFilterChecks(params.renditionFilter),
					r;
				
				while (i--) {
					if (r = _renditions[results[i].id]) {
						results[i].renditions =
							this.getRenditions(r, renditionChecks);
					} else {
						results[i].renditions = [];
					}
				}
			}
			
			callback.call(this, results);
		};
		
		repo.getRenditions = function (renditions, renditionChecks) {
			var matches = [],
			    alreadyMatched = [],
			    check,
				matched = false;
			
			for (var j = renditions.length - 1; j >= 0; j--) {
				for (var k = renditionChecks.length - 1; k >= 0; k--) {
					check = renditionChecks[k];
					
					if (check == '*') {
						matched = true;
					} else if (typeof check[1] === 'string') {
						matched = renditions[j][check[0]].toLowerCase() == check[1];
					} else {
						matched = renditions[j][check[0]].match(check[1]);
					}
					
					matched
						&& jQuery.inArray(j, alreadyMatched) == -1
							&& matches.push(renditions[j])
								&& alreadyMatched.push(j);
				}
			}
			
			return matches;
		};
		
		repo.getChildren = function(p, callback) {
			var that = this,
				
				inFolderId = 1, // TODO: use p.inFolderId?
				
				request = {
					url		 : restURL('folder/getFolders/' + inFolderId),
					dataType : 'json',
					type	 : 'GET',
					// TODO: move this to success when working
					error	 : function () {
						jQuery.('body').trigger('aloha-repository-getChildren-error', that);
						callback.call(that, items);
					},
					
					success	: function(data) {
						var items = [];
						
						if (that.handleRestResponse(data)) {
							var folders = data.folders,
								folder;
							
							for (var i = 0, j = folders.length; i < j; i++) {
								folder = folders[i];
								
								console.log(folder);
								
								items.push({
									objectType	 :  'folder',
									id			 :  folder.id,
									name	 	 :  folder.name,
									repositoryId :  that.repositoryId,
									url			 :  folder.publishDir,
									hasMoreItems : (folder.subfolders && folder.subfolders.length > 0)
								});
							}
						}
						
						callback.call(that, items);
					}
				};
			
			jQuery.ajax(request);
		};
		
		repo.handleRestResponse = function (response) {
			if (!response) {
				this.triggerError('No response data received');
				return false;
			}
			
			if (response.responseInfo && response.responseInfo.responseCode != 'OK') {
				var l,
					msg = [],
					msgs = response.messages;
				
				if (msgs && (l = msgs.length)) {
					while (l--) {
						msgs[l].message && msg.push(msgs[l].message);
					}
					
					msg = msg.join('\n');
				} else {
					msg = 'REST-API Error';
				}
				
				this.triggerError(msg);
				
				return false;
			}
			
			return true;
		};
		
		// Repo Browser not recieving this. Is the problem here?
		repo.triggerError = function (message) {
			var error = {
				repository : this,
				message	   : message
			};
			jQuery('body').trigger('aloha-repository-error', error);
			console.warn(error);
		};
		
		/**
		 * Get the repositoryItem with given id
		 * @param itemId {String} id of the repository item to fetch
		 * @param callback {function} callback function
		 * @return {Aloha.Repository.Object} item with given id
		 */
		repo.getObjectById = function (itemId, callback) {
			var items = [];
			
			callback.call(this, items);
			
			return true;
		};
	};
	
	jQuery(function () {
		jQuery('body')
			.bind('aloha', initializeRepository)
			.bind('alohacoreloaded', createRepository);
	});
	
})(window);

