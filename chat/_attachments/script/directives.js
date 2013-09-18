'use strict';

/* Directives */

angular.module('ng').directive('ngFocus', function($timeout) {
  return {
    link: function ( scope, element, attrs ) {
      scope.$watch( attrs.ngFocus, function ( val ) {
	if ( angular.isDefined( val ) && val ) {
	  $timeout( function () { element[0].focus(); } );
	}
      }, true);
      
      element.bind('blur', function () {
	if (!scope.modal) element[0].focus();
      });
    }
  };
});

var mgChatDirectives = angular.module('mgChat.directives', []);

mgChatDirectives.directive('tabs', ['$timeout','$window',function($timeout,$window) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      selected: '=',
    },
    controller: function($scope, $attrs, $element) {
      var panes = $scope.panes = [];
      $scope.select = function(pane) {
	angular.forEach(panes, function(pane) {
	  pane.selected = false;
	});
	pane.selected = true;
	pane.newMsgs = false;
	$timeout(function(){ $scope.selected = pane.title; });
	console.log('selected ' + pane.title);
      }
      
      this.addPane = function(pane) {
	if (panes.length == 0) $scope.select(pane);
	panes.push(pane);
      }
      
      this.removePane = function(pane) {
	if (pane.selected) $scope.select(panes[0]);
	panes.splice(panes.indexOf(pane),1);
      }
    },
    link: function postLink(scope, element, attrs) {
      scope.$watch(function() {
	return $('#content-container .active .messages').children().length;
      }, resizeSidebar);
      $(window).resize(function() {
        $('#sidebar, .messages').removeAttr('style');
        resizeSidebar();
      });
      function resizeSidebar() {
	var sidebar = $('#sidebar'),
	    container = $('.messages'),
	    sidebarHeight = sidebar.height(),
	    containerHeight = container.height();
	if (containerHeight < sidebarHeight + 5) {
	  container.height(sidebarHeight + 5);
	  sidebar.height(sidebarHeight);
        } else {
	  sidebar.height(containerHeight - 5);
	  container.height(containerHeight);
	}
      }
    },
    template: 
      '<div class="tabbable tabs-right" style="overflow:auto">' +
        '<ul class="nav nav-tabs" id="sidebar">' +
          '<li ng-repeat="pane in panes" ng-class="{active:pane.selected, new:pane.newMsgs}">' +
            '<a href="" ng-click="select(pane)"><i ng-class="pane.icon"></i>{{pane.title}}</a>' +
          '</li>' +
        '</ul>' +
        '<div class="tab-content" id="content-container" ng-transclude></div>' +
      '</div>',
    replace: true
  };
}]);

mgChatDirectives.directive('pane', ['$rootScope',function($rootScope) {
  return {
    require: '^tabs',
    restrict: 'E',
    transclude: true,
    scope: { 
      title: '@',
      numMsgs: '@',
      icon: '@'
    },
    link: function(scope, element, attrs, tabsCtrl) {
      tabsCtrl.addPane(scope);
      scope.$on("$destroy",function() {
	tabsCtrl.removePane(scope);
      });
    },
    controller: function($scope, $attrs, $element) {
      $scope.newMsgs = false;
      $scope.$watch('numMsgs',function(oldVal,newVal) {
	if (oldVal !== newVal)
	  if (!$scope.selected)
	    $scope.newMsgs = true;
      });
    },
    template: 
      '<div class="tab-pane" ng-class="{active: selected}">' +
        '<div class="messages" autoscroll-down ng-transclude></div>' +
      '</div>',
    replace: true
  };
}]);

// From https://github.com/james-huston/angular-directive-autoscroll
mgChatDirectives.directive('autoscrollDown', function () {
  return {
    link: function postLink(scope, element, attrs) {
      scope.$watch(
	function () {
	  return element.children().length;
	},
	function () {
	  element.animate({ scrollTop: element.prop('scrollHeight')}, 0);
	}
      );
    }
  };
});
