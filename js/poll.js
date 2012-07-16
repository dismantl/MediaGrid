$(document).ready(function(){ 
//alert(window.location + '&poll=');
//getData(new Date().getTime()/1000);
getData($('.epoch').first().text());
//alert($('.epoch').first().text());
});

var getData = function(lastupdate) {
$.ajax({
	type: "GET",
	// set the destination for the query
	url: window.location + '&poll='+lastupdate,
	// needs to be set to true to avoid browser loading icons
	async: true,
	//cache: false,
	// timeout after 30 seconds
	timeout:30000,
	// process a successful response
	success: function(response) {
		//alert(response);
		//$('#headers').after(response).slideDown('slow','linear');
		$(response).insertAfter('#headers').fadeIn("slow");
		//alert(response);
		//setTimeout('getData('+$('.epoch').first().text()+');', 1000);
		getData($('.epoch').first().text());
	},
	// handle error
	error: function(XMLHttpRequest, textStatus, errorThrown){
		// try again in 10 seconds if there was a request error
		//alert(errorThrown);
		setTimeout('getData('+$('.epoch').first().text()+');', 1000);
		//getData($('.epoch').first().text());
	},
});
};
