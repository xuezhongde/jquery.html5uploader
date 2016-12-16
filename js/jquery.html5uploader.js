/*
 * File:        jquery.html5uploader.js
 * Version:     1.0.0
 * Author:      xuezd (xuezhongde@gmail.com)
 *
 */
(function($) {
	
	$.fn.html5uploader = function(opts) {
		opts = $.extend({}, $.fn.html5uploader.defaults, opts);
		
		this.each(function (){
			var uploader = new Html5uploader(this, opts);
			uploader.init();
		});
	};
	
	var Html5uploader = function(div, opts) {
		
		//------------------------------
		//-- object variable
		//------------------------------
		this.opts = opts;
		
		//------------------------------
		//-- private variable
		//------------------------------
		var $container = $(div), 
			$fileSelector, 
			$inputFile, 
			$fileList, 
			_files = [], 
			_this = this;
	
		//------------------------------
		//-- object methods
		//------------------------------
		this.onUpload = opts.onUpload;
		this.onUploadComplete = opts.onUploadComplete;
		this.onUploadError = opts.onUploadError;
		this.onDelete = opts.onDelete;
		this.onFileSelected = opts.onFileSelected;
		this.onFileSizePrevent = opts.onFileSizePrevent;
		this.onFileTypePrevent = opts.onFileTypePrevent;
		
		this.fileSelected = function(files) {
			_this.onFileSelected(files);
			
			var filterdFiles = _this.filter(files);
			for(var i= 0; i < filterdFiles.length; i++) {
				var file = filterdFiles[i];
				var html = opts.template;
				html = html.replace(/\${FILE_ID}/g, file.fileId).replace(/\${FILE_NAME}/g, file.name).replace(/\${FILE_SIZE}/g, formatFileSize(file.size));
				$fileList.append(html);
			}
		};
		this.filter = function(files) {
			var filterdFiles = [];
			var fileCount = _files.length;
			
			for(var i= 0; i < files.length; i++) {
				var file = files[i];
				
				if(preventFileSize(file)) {
					_this.onFileSizePrevent(file);
					continue;
				}
				
				if(preventFileType(file)) {
					_this.onFileTypePrevent(file);
					continue;
				}
				
				file.fileId = 'file-' + fileCount++;
				_files.push(file);
				filterdFiles.push(file);
			}
			
			return filterdFiles;
		};
		this.uploadFile = function(file) {
			_this.onUpload(file);
			
			var $uploadBtn = $('#' + file.fileId).find(".file-upload-btn");
			var $deleteBtn = $('#' + file.fileId).find(".file-delete-btn");
			$uploadBtn.fadeOut();
			$deleteBtn.fadeOut();
			
			var xhr = new XMLHttpRequest();
			if(xhr.upload) {
				xhr.upload.addEventListener("progress", function(e){
					onProgress(file, e.loaded, e.total);
				}, false);

				xhr.onreadystatechange = function(){
					if(xhr.readyState == 4) {
						if(xhr.status == 200) {
							_this.onUploadComplete(file, xhr.responseText);
						}else{
							$uploadBtn.fadeIn();
							$deleteBtn.fadeIn();
							_this.onUploadError(file, xhr.responseText);
						}
					}
				};
				
				xhr.open("POST", opts.url, true);
				xhr.setRequestHeader("X_FILENAME", unescape(encodeURIComponent(file.name)));
                xhr.setRequestHeader('X-Requested-With','XMLHttpRequest');
                var fd = new FormData();
                fd.append(file.name, file);
                xhr.send(fd);
			}
		};
		this.deleteFile = function(file) {
			_this.onDelete(file);
			$('#' + file.fileId).fadeOut();
		};
		this.init = function() {
			var html = [];
			html.push('<input type="file" style="display:none;" ' + (opts.multi ? 'multiple' : '') + ' />');
			html.push('<a class="file-selector" href="javascript:void(0);">' + opts.buttonText + '</a>');
			html.push('<ol class="file-list"></ol>');
			
			$container.append(html.join(''));
			$inputFile = $container.find(":input[type=file]");
			$fileSelector = $container.find("a.file-selector");
			$fileList = $container.find("ol.file-list");
			
			//bind fileSelector click event
			$fileSelector.on("click", function(){
				$inputFile.trigger("click");
			});
			
			//select files listener
			$inputFile.on("change", function(e){
				var files = e.target.files || e.dataTransfer.files;
				_this.fileSelected(files);
			});
			
			//upload listener
			$fileList.on("click", "a.file-upload-btn", function(){
				var fileId = $(this).parent().attr("id");
				_this.uploadFile(getFile(fileId, _files));
			});
			
			//delete listener
			$fileList.on("click", "a.file-delete-btn", function(){
				var fileId = $(this).parent().attr("id");
				_this.deleteFile(getFile(fileId, _files));
			});
		};
		
		//------------------------------
		//-- private methods
		//------------------------------
		var formatFileSize = function(size) {
			if(size > 1024 * 1024) {
				size = (Math.round(size / 1024 / 1024 * 100) / 100).toString() + "MB";
			}else{
				size = (Math.round(size / 1024 * 100) / 100).toString() + "KB";
			}
			return size;
		};
		var getFile = function(fileId, files) {
			for(var i = 0; i < files.length; i++) {
				if(files[i].fileId == fileId) {
					return files[i];
				}
			}
			return false;
		};
		var preventFileSize = function(file) {
			if(file.size > _this.opts.maxFileSize) {
    			return true;
    		}
			return false;
		};
		var preventFileType = function(file) {
			if(file.type == '') return false;
			
			if(_this.opts.blackListFileType != '') {
				if (file.type.match(_this.opts.blackListFileType)) {
	        		return true;
	        	}
        	}
        	
        	if(_this.opts.allowedFileType == '') {
        		return false;
        	}
        	
        	return _this.opts.allowedFileType.indexOf(file.type) < 0;
		};
		var onProgress = function (file, loaded, total) {
            var fileItem = $('#' + file.fileId);
			fileItem.find(".file-upload-progress-bar").css('width', (loaded / total * 100).toFixed(2) + '%');
			fileItem.find(".file-upload-progress-num").html(formatFileSize(loaded) + '/' + formatFileSize(total));
        };
	};
	
	$.fn.html5uploader.defaults = {
		url: '',
		auto: false,
		multi: true,
		maxFileSize: 100 * 1024 * 1024, //default 100MB
		blackListFileType: '', //file black list regular express
		allowedFileType: '', //file type mime, etc, 'image/gif, image/jpeg'
		buttonText: '选择文件',
		removeTimeout: 1000,
		template: '<li class="file-item" id="${FILE_ID}"><div class="file-upload-progress"><div class="file-upload-progress-bar"></div></div><span class="file-name">${FILE_NAME}</span><span class="file-upload-progress-num">0/${FILE_SIZE}</span><a class="file-upload-btn">上传</a><a class="file-delete-btn">删除</a><span class="file-upload-status"></span></li>',
		onUpload: function(){},
		onUploadComplete: function(){},
		onUploadError: function(){},
		onDelete: function(){},
		onFileSelected: function(){},
		onFileSizePrevent: function(){},
		onFileTypePrevent: function(){}
	};
	
})(jQuery);