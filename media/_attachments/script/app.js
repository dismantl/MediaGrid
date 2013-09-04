'use strict';

angular.module('mgFiles',['couchdbServices'])
.controller('mgFileCtrl', ['$scope','path','db','createDir','uploadFile','getFiles',function($scope,path,db,createDir,uploadFile,getFiles) {
  
  $scope.links = [];
  var changesRunning = false;

  if (path.dir) {
    var paths = path.dir.split('/');
    $scope.current = paths.pop();
    for (var i in paths) {
      $scope.links.unshift({
        path: i ? paths.join('/') : paths.slice(0,-i).join('/'),
        text: paths[paths.length-i-1]
      });
    }
  }
  
  function setupChanges(since) {
    if (!changesRunning) {
      var changeHandler = db.changes(since);
      changesRunning = true;
      changeHandler.onChange(updateItems);
    }
  }
  
  function updateItems() {
    $scope.items = [];
    getFiles.fetch().then(function(data) {
      setupChanges(data.update_seq);
      angular.forEach(data.rows,function(r,_) {
        if (r.value.type === 'FILE') {
	  r.value.fileurl = '/' + path.pathArray[1] + '/' + r.value.fileurl;
        } else if (r.value.type === 'DIR') {
	  r.value.fileurl = document.location.pathname + "?dir=" + ((path.dir) ? (path.dir + '/') : '') + r.value.fileurl;
        }
        $scope.items.push(r.value);
      });
    });
  }
  
  $scope.makeDir = function(newdir) {
    createDir($scope.newdir);
    $scope.newdir = '';
  };
  
  $scope.uploadFile = function() {
    var form = $('#upload'),
      attachments = $("[name='_attachments']", form),
      _rev = $("[name='_rev']", form);
    uploadFile(form,_rev,attachments).then(function() {
      attachments.val('');
    });
  };
  
  updateItems();
  
}]);