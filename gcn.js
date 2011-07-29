/*!
 * Aloha Editor
 * Author & Copyright (c) 2010 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

(function GCNRepositoryClosure (window, undefined) {
	
	'use strict'
	
	var
		GENTICS = window.GENTICS || (window.GENTICS = {}),
		 jQuery = window.alohaQuery || window.jQuery,
			  $ = jQuery, 
		  Aloha = window.Aloha;
	
	var sid = '';
	
	function getSid (callback) {
		$.ajax({
			url: '/Aloha-Editor/Aloha-Editor-Browser/src/demo/browser/gcn_proxy.php?url='
				 + encodeURIComponent('http://soc-aacc-cms.gentics.com/.Node/?do=31&login=node&password=node'),
			error: function (data) {},
			success: function (data) {
				var json = JSON.parse(data);
				
				sid = json.sessionToken;
				
				if (sid && sid != '' && typeof callback === 'function') {
					callback();
				}
			}
		});
	};
	
	function createRepositories () {
		/**
		 * Create the Repositories object. Namespace for Repositories
		 * @hide
		 */
		if (!Aloha.Repositories) {
			Aloha.Repositories = {};
		}
	};
	
	function initializeRepository () {
		
		// FIXME: Put this to config object
		var host = 'http://soc-aacc-cms.gentics.com';
		
		function restURL (method) {
			var delim = method.match(/\?[^\=]+\=/) ? '&' : '?';
			var url = host + '/CNPortletapp/rest/' + method + delim + 'sid=' + sid;
			
			return '/Aloha-Editor/Aloha-Editor-Browser/src/demo/browser/gcn_proxy.php?url='
				+ encodeURIComponent(url);
		};
		
		/**
		 * register the plugin with unique name
		 */
		 // Aloha.Respository is now Aloha.AbstractRepository
		var Repo = Aloha.Repositories.GCNRepo = new Aloha.Repository('com.gentics.aloha.GCN.Document');
		
		Repo.init = function () {
			this.repositoryName = 'com.gentics.aloha.GCN.Document';
		};
		
		/**
		 * Convert orderBy from [{field: order} ...] to [{by:field, order:order} ...]
		 * for easier access in sort comparison function
		 */
		Repo.buildSortPairs = function (orderBy) {
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
					if (typeof order === 'string') {
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
		Repo.buildRenditionFilterChecks = function (filters) {
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
		 * Transforms the given data (fetched from the backend) into a repository folder
		 * @param {Object} data data of a folder fetched from the backend
		 * @return {GENTICS.Aloha.Repository.Object} repository item
		 */
		Repo.getFolder = function(data) {
			if (!data) {
				return null;
			}
			
			return new Aloha.Repository.Folder({
				repositoryId
					 : this.repositoryId,
				type : 'folder',
				id	 : data.id,
				name : data.name
			});
		};
		
		/**
		 * Transforms the given data (fetched from the backend) into a repository item
		 * @param {Object} data data of a page fetched from the backend
		 * @return {GENTICS.Aloha.Repository.Object} repository item
		 */
		Repo.getDocument = function(data, objecttype) {
			if (!data) {
				return null;
			}
			
			objecttype = objecttype || '10007';
			// set the id
			data.id = objecttype + '.' + data.id;
			
			// make the path information shorter by replacing path parts in the middle with ...
			var path = data.path;
			var pathLimit = 55;
			
			if (path && (path.length > pathLimit)) {
				path = path.substr(0, pathLimit/2) + '...' + path.substr(path.length - pathLimit/2);
			}
			
			data.path = path;
			
			// TODO make this more efficient (you don't have to make a call for every url)
			//if (data.url && GENTICS.Aloha.GCN.settings.renderBlockContentURL) {
			//	data.url = GENTICS.Aloha.GCN.renderBlockContent(data.url);
			//}
			
			data.repositoryId = this.repositoryId;
			
			return new Aloha.Repository.Document(data);
		};
		
		/**
		 * Queries for a resource of a given type against specified parameters.
		 * If we don't have a method to handle the type of resource requested,
		 * we invoke the callback with an empty array and log a warning.
		 *
		 * @param {string}	 type - of resource to query for (page, file, image)
		 * @param {string}	 id
		 * @param {object}	 params - xhr query parameters
		 * @param {array}	 collection - the array to which we add found documents
		 * @param {function} callback
		 * @return {undefined}
		 */
		Repo.getResources = function (type, folderId, params, collection, callback) {
			var that = this,
				restMethod,
				objName,
				docTypeNum;
			
			switch (type) {
			case 'page':
				restMethod = 'getPages';
				objName = 'pages';
				docTypeNum = '10007';
				break;
			case 'file':
				restMethod = 'getFiles';
				objName = 'files';
				docTypeNum = '10008';
				break;
			case 'image':
				restMethod = 'getImages';
				objName = 'image';
				docTypeNum = '10009'; // FIXME: Confirm that this is correct for files
				break;
			default:
				console.warn(
					'This repository has not method to query for resource type "' + type + '"\n\
					available resources are page, image, and file'
				);
				callback(collection);
				return;
			};
			
			$.ajax({
				url		 : restURL('folder/' + restMethod + '/' + folderId),
				data	 : params,
				dataType : 'json',
				type	 : 'GET',
				
				error : function (data) {
					that.handleRestResponse(data);
					callback(collection);
				},
				
				success	: function (data) {
					if (that.handleRestResponse(data)) {
						if (typeof collection !== 'object') {
							collection = [];
						}
						
						var objs = data[objName];
						
						for (var i = 0, j = objs.length; i < j; i++) {
							objs[i] = that.getDocument(objs[i], docTypeNum);
							collection.push(objs[i]);
						}
					}
					
					callback(collection);
				}
			});
		};
		
		/**
		 * Searches a repository for items matching the given query.
		 * The results are passed as an array to the callback.
		 * If no objects are found the callback receives null.
		 *
		 * TODO: implement caching
		 *
		 * @param {object}	 query - query parameters.
		 *					 An example query parameters object could look something like this:
		 *						{
		 * 							filter		: ["language"],
		 * 							inFolderId	: 4,
		 * 							maxItems	: 10,
		 * 							objectTypeFilter
		 *										: ["website", "files"],
		 * 							orderBy		: null,
		 * 							queryString	: null,
		 * 							renditionFilter
		 *										: ["*"],
		 * 							skipCount	: 0
		 *						}
		 * @param {function} callback
		 * @return {undefined}
		 */
		Repo.query = function (query, callback) {
			var that = this,
				p = query;
			
			// If we don't have a session id, get it and invoke this method again
			if (!sid || sid == '') {
				var args = arguments;
				getSid(function () {
					that.query.apply(that, args);
				});
			} else {
				// check whether a magiclinkconstruct exists. If not, just do nothing, since setting GCN links is not supported
				//if (!GENTICS.Aloha.GCN.settings.magiclinkconstruct) {
				//	callback.call(that);
				//}
				
				var params = {
				//	links: GENTICS.Aloha.GCN.settings.links
				};
				
				params.query	 = p.queryString || undefined;
				params.maxItems	 = p.maxItems	 || undefined;
				params.skipCount = p.skipCount	 || undefined;
				
				if (p.inFolderId) {
					params.folderId = p.inFolderId;
					params.recursive = false;
				}
				
				// If objectTypeFilter has been specified, then only check for
				// resources of types found in objectTypeFilter array.
				// Otherwise collect everthing.
				var documentTypesToCollection;
				
				if (p.objectTypeFilter && p.objectTypeFilter.length) {
					documentTypesToCollection = [];
					
					if($.inArray('website', p.objectTypeFilter) > -1) {
						documentTypesToCollection.push('page');
					}
					
					if($.inArray('files', p.objectTypeFilter) > -1) {
						documentTypesToCollection.push('file');
					}
					
					if($.inArray('images', p.objectTypeFilter) > -1) {
						documentTypesToCollection.push('image');
					}
				} else {
					documentTypesToCollection = ['page', 'file', 'image'];
				}
				
				// Once all resources have been collected through their
				// respective methods, we then call processQueryResults, and
				// pass to it the array of repo documents found, the original
				// params object, and the original callback expecting to
				// receive the final processed results
				var processResults = function (collection) {
					that.processQueryResults(collection, query, callback);
				};
				
				var collection = [];
				
				// Recursively query for objects types specified in
				// documentTypesToCollection. Pop documentTypesToCollection
				// on each iteration until documentTypesToCollection is empty
				var collectResults = function (collection) {
					var type = documentTypesToCollection.pop();
					
					that.getResources(
						type,
						p.inFolderId,
						params,
						collection,
						documentTypesToCollection.length ? collectResults : processResults
					);
				};
				
				collectResults(collection);
			}
		};
		
		/**
		 * Handles queryString, filter, and renditionFilter which the REST-API
		 * doesn't at the moment
		 */
		Repo.processQueryResults = function (documents, params, callback) {
			var skipCount = 0,
				l = documents.length,
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
			
			var contentSets = {};
			
			for (; i < l; i++) {
				elem = documents[i];
				
				if (!hasQueryString || elem.name.match(rgxp) || elem.url.match(rgxp)) {
					if (skipCount) {
						skipCount--;
					} else {
						if (hasFilter) {
							// Filter out all unrequired properties from each
							// object, and leave only those specified in the
							// filter array
							
							// Copy all fields that returned objects must
							// contain, according to Repository specification
							obj = {
								id		 : elem.id,
								name	 : elem.name,
								baseType : 'document',	// TODO: could we use contentGroupId?
								type	 : 'page'		// FIXME: What if it's an image of file
							};
							
							// Copy all requested fields specified in filter
							// array
							for (var f = 0; f < params.filter.length; f++) {
								obj[params.filter[f]] = elem[params.filter[f]];
							}
						} else {
							// If no filter is specified, then return all
							// properties of each documents
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
			
			// Build renditions from contentSet hash
			var renditions = {};
			$.each(contentSets, function () {
				var members = [],
					// Skip the first one, because this will be the returned
					// result of which the other documents in the contentSet
					// are rendition of
					i = 1,
					j = this.length,
					r;
				
				for (; i < j; i++) {
					var r = this[i];
					members.push({
						id		: r.id,	
						url		: r.path + r.fileName,
						filename: r.fileName,
						kind	: 'translation',
						language: r.language,
						mimeType: 'text/html',
						height	: null,
						width	: null
					});
				}
				
				// The key for this set of renditions is the id of the first
				// document in the contentSet from which these renditions
				// belong to
				renditions[this[0].id] = members;
			});
			
			var orderBy = this.buildSortPairs(params.orderBy);
			
			if (orderBy.length) {
				// Predicate function to sort entries based on order of each
				// column's importance as defined by order of sortorder-sortby
				// pairs
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
			
			// Truncate results at maxItems
			if (typeof params.maxItems === 'number') {
				results = results.slice(0, params.maxItems);
			}
			
			if (hasRenditionFilter && (i = results.length) && renditions) {
				var renditionChecks = this.buildRenditionFilterChecks(params.renditionFilter),
					r;
				
				while (i--) {
					if (r = renditions[results[i].id]) {
						results[i].renditions =
							this.getRenditions(r, renditionChecks);
					} else {
						results[i].renditions = [];
					}
				}
			}
			
			callback.call(this, results);
		};
		
		Repo.getRenditions = function (renditions, renditionChecks) {
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
						&& $.inArray(j, alreadyMatched) == -1
							&& matches.push(renditions[j])
								&& alreadyMatched.push(j);
				}
			}
			
			return matches;
		};
		
		Repo.getChildren = function(params, callback) {
			var that = this;
			
			if (!sid || sid == '') {
				var args = arguments;
				
				getSid(function () {
					that.getChildren.apply(that, args);
				});
			} else {
				if (params.inFolderId == this.repositoryId) {
					params.inFolderId = 0;
				}
				
				$.ajax({
					url		: restURL('folder/getFolders/' + params.inFolderId + '?recursive=true'),
					dataType: 'json',
					type	: 'GET',
					// TODO: move this to success when working
					error	: function () {
						callback.call(that, []);
					},
					success	: function(data) {
						if (that.handleRestResponse(data)) {
							var folders = data.folders;
							for (var i = 0, j = folders.length; i < j; i++) {
								folders[i] = that.getFolder(data.folders[i]);
								
								/*
									items.push({
									objectType	 :  'folder',
									id			 :  folder.id,
									name	 	 :  folder.name,
									repositoryId :  that.repositoryId,
									url			 :  folder.publishDir,
									hasMoreItems : (folder.subfolders && folder.subfolders.length > 0)
								});
								*/
							}
						}
						
						callback.call(that, folders);
					}
				});
			}
		};
		
		/**
		 * Get the repositoryItem with given id
		 * @param itemId {String} id of the repository item to fetch
		 * @param callback {function} callback function
		 * @return {GENTICS.Aloha.Repository.Object} item with given id
		 */
		Repo.getObjectById = function (itemId, callback) {
			var that = this;

			if (itemId.match(/^10007./)) {
				itemId = itemId.substr(6);
			}
			$.ajax ({
				url: restURL('page/load/' + itemId),
				type: 'GET',
				success: function(data) {
					if (data.page) {
						callback.call(that, [that.getDocument(data.page)]);
					}
				}
			});
		};
		
		Repo.handleRestResponse = function (response) {
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
		Repo.triggerError = function (message) {
			var error = {
				repository : this,
				message	   : message
			};
			$('body').trigger('aloha-repository-error', error);
			console.warn(error);
		};
		
	};
	
	$(function () {
		$('body')
			.bind('aloha', initializeRepository)
			.bind('alohacoreloaded', createRepositories);
	});
	
})(window);

