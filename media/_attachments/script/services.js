'use strict';

/* Services */

angular.module('couchdbServices', [])
  .value('path',{
    pathArray: unescape(document.location.pathname).split('/'),
    design: unescape(document.location.pathname).split('/')[3],
    dir: getParameterByName("dir")
  })
  .factory('db',['path',function(path) { return $.couch.db(path.pathArray[1]); }])
  .factory('getFiles', ['$q','db','path','$rootScope', function($q,db,path,$rootScope){
    return {
      fetch: function() {
        var deferred = $q.defer();
        db.view(path.design + "/files", {
	    keys : [path.dir],
	    descending : "true",
	    update_seq : true,
	    success : function(data) {
	      $rootScope.$apply(function(){deferred.resolve(data)});
	    },
	    error: function() {
	      alert('error fetching files!');
	    }
        });
	return deferred.promise;
      },
    };
  }])
  .factory('createDir', ['db','path', function(db,path) {
    return function(newdir) {
      var doc = {
	type: 'DIR',
	dir: path.dir,
	created_at: new Date(),
	name: newdir
      };
      db.saveDoc(doc, {
	error: function() {
	  alert('error creating directory!');
	}
      });
    };
  }])
  .factory('uploadFile', ['db','path','$q','$rootScope', function(db,path,$q,$rootScope) {
    return function(form,_rev,_attachments) {
      console.log(form);
      console.log(_attachments);
      console.log(_rev);
      
      if (path.dir) form.dir = path.dir;
      var doc = { type: 'FILE', dir: form.dir} ;
      var deferred = $q.defer();
      $.ajax({
	url: '//' + document.location.host + '/' + path.pathArray[1] + '/_design/' + path.design + '/_update/file',
	type: 'POST',
	data: doc,
	success: function(doc_id, status, jqXHR) {
	  _rev.val(jqXHR.getResponseHeader('X-Couch-Update-NewRev'));
	  var attachments = _attachments.val();
	  if (attachments) {
	    $(form).ajaxSubmit({
	      url: db.uri + $.couch.encodeDocId(doc_id),
	      success: function(){ $rootScope.$apply(deferred.resolve); }
	    });
	  }
	}
      });
      return deferred.promise;
    };
  }]);
  
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)')
		    .exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}
