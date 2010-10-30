/*
filereader.js - a lightweight wrapper for common FileReader usage.
Open source code under MIT license: http://www.opensource.org/licenses/mit-license.php
Author: Brian Grinstead

See http://github.com/bgrins/filereader.js for documentation
*/

(function(global) {
	
	var FileReader = global.FileReader;
	var FileReaderJS = global.FileReaderJS = { 
		enabled: false,
		opts: {
			dragClass: false,
			accept: false,
			readAsMap: {
				'image/*': 'DataURL',
				'text/*' : 'Text'
			},
			readAsDefault: 'BinaryString',
			on: {
				loadstart: noop,
				progress: noop,
				load: noop,
				abort: noop,
				error: noop,
				loadend: noop,
				skip: noop,
				groupstart: noop,
				groupend: noop
			}
		}
	};
	var fileReaderEvents = ['loadstart', 'progress', 'load', 'abort', 'error', 'loadend'];
	
	if (!FileReader) {
		// Not all browsers support the FileReader interface.  Return with the enabled bit = false
		return;
	}
	
	function setupInput(input, opts) {
		var instanceOptions = extend(extend({}, FileReaderJS.opts), opts);
		
		input.addEventListener("change", inputChange, false);
		function inputChange(e) {
			handleFiles(e.target.files, instanceOptions);
		}
	}
	
	function setupDrop(dropbox, opts) {
		var instanceOptions = extend(extend({}, FileReaderJS.opts), opts),
			dragClass = instanceOptions.dragClass;
		
		dropbox.addEventListener("dragenter", dragenter, false);
		dropbox.addEventListener("dragleave", dragleave, false);
		dropbox.addEventListener("dragover", dragover, false);
		dropbox.addEventListener("drop", drop, false);
		
		function drop(e) {
			e.stopPropagation();
			e.preventDefault();
			if (dragClass) {
				removeClass(dropbox, dragClass);
			}
			handleFiles(e.dataTransfer.files, instanceOptions);
		}
		function dragenter(e) {
			if (dragClass) {
				addClass(dropbox, dragClass);
			}
			e.stopPropagation();
			e.preventDefault();
		}
		function dragleave(e) {
			if (dragClass) {
				removeClass(dropbox, dragClass);
			}
		}
		function dragover(e) {
			e.stopPropagation();
			e.preventDefault();
		}
	}

	// Modify the file object with convenience properties
	function setupCustomFileProperties(files, groupID) {
		for (var i = 0; i < files.length; i++) {
			var file = files[i];
			file.nameNoExtension = file.name.substring(0, file.name.lastIndexOf('.'));
			file.extension = file.name.substring(file.name.lastIndexOf('.') + 1);
			file.id = getFileID();	
			file.groupID = groupID;
			file.prettySize = prettySize(file.size);
		}
	}
	
	function readAs(type, readAsMap, readAsDefault) {
		for (var r in readAsMap) {
			if (type.match(new RegExp(r))) {
				return 'readAs' + readAsMap[r];
			}
		}
		return 'readAs' + readAsDefault;
	}
	
	function handleFiles(files, opts) {
	
		var group = { 
			groupID: getGroupID(),
			files: files
		};
		var filesLeft = files.length;
		var groupFileDone =	function() {
			if (--filesLeft == 0) {
			    opts.on.groupend(group);
			}
		};
			
		setupCustomFileProperties(files, group.groupID);
		
		opts.on.groupstart(group);
		
		// No files in group - call groupend immediately
		if (!files.length) {
			opts.on.groupend(group);
		}
		
		for (var i = 0; i < files.length; i++) {
			
			var file = files[i];
			if (opts.accept && !file.type.match(new RegExp(opts.accept))) {  
				opts.on.skip(file);
				continue;  
			}  
			
			var reader = new FileReader();
			
			for (var j = 0; j < fileReaderEvents.length; j++) {
				var eventName = fileReaderEvents[j];
				
				// bind to a self executing function that returns a function that
				// passes the file along to the callback, so we have access to the file
				// from the ProgressEvent.  Need to keep scope for current file and eventName
				reader['on' + eventName] = (function(eventName, file) {
					return function(e) {
						if (eventName == 'loadend') {
							groupFileDone();
						}
						opts.on[eventName](e, file);
					};
				})(eventName, file);
			}
			
			reader[readAs(file.type, opts.readAsMap, opts.readAsDefault)](file);
		}
	}
	
	// noop - A function that does nothing
	function noop() { 

	}
	
	// extend - used to make deep copies of options object
	function extend(destination, source) {
		for (var property in source) {
			if (source[property] && source[property].constructor &&
				source[property].constructor === Object) {
				destination[property] = destination[property] || {};
				arguments.callee(destination[property], source[property]);
			} 
			else {
				destination[property] = source[property];
			}
		}
		return destination;
	}
	
	// add/remove/has Class: basic class manipulation for drop zone
	function hasClass(ele,cls) {
		return ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
	}
	
	function addClass(ele,cls) {
		if (!hasClass(ele,cls)) ele.className += " "+cls;
	}
	
	function removeClass(ele,cls) {
		if (hasClass(ele,cls)) {
			var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
			ele.className=ele.className.replace(reg,' ');
		}
	}
	
	// prettySize: convert bytes to a more readable string
	function prettySize(bytes) {
		var s = ['bytes', 'kb', 'MB', 'GB', 'TB', 'PB'];
		var e = Math.floor(Math.log(bytes)/Math.log(1024));
		return (bytes/Math.pow(1024, Math.floor(e))).toFixed(2)+" "+s[e];
	}
	
	var getGroupID = (function() {
		var id = 0;
		return function() {
			return id++;
		}
	})();
	
	var getFileID = (function() {
		var id = 0;
		return function() {
			return id++;
		}
	})();
	
	// The interface is supported, bind the FileReaderJS callbacks
	FileReaderJS.enabled = true;
	FileReaderJS.setupInput = setupInput;
	FileReaderJS.setupDrop = setupDrop;
	
	// setup jQuery plugin if available
	if (typeof(jQuery) !== "undefined") {
		jQuery.fn.fileReaderJS = function(opts) {
			return this.each(function() {
				$(this).is("input") ? setupInput(this, opts) : setupDrop(this, opts);
			});
		};
	}
	
})(this);
