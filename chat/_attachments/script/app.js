'use strict';

var myApp = angular.module('mgChat',['ui.bootstrap','mgChat.directives','mgChat.couchdbServices','mgChat.controllers','mgChat.filters']);

myApp.config(function($routeProvider) {
  $routeProvider.
  when('/', {templateUrl: checkWidth() + '.html'});
  function checkWidth() {
//     TODO: uncomment this when mobile client ready
//     if (window.document.width < 760)
//       return 'mobile';
//     else
      return 'desktop';
  }
});