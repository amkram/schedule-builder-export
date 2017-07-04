//Event page to export the calendar events to Google Calendar
chrome.runtime.onMessage.addListener(
  //When we receive a message from the content script...
  function(request, sender, sendResponse) {
  	 //Authorize the user
  	 chrome.identity.getAuthToken({'interactive': true }, 
  	 	function(token) {
			var url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
			
			for(var i = 0; i < request.length; i++) {
				var http = new XMLHttpRequest();	
				http.open("POST", url, true);
				http.setRequestHeader("Content-type", "application/json");
				http.setRequestHeader("Authorization", "Bearer "+token);
				var params = JSON.stringify(request[i]); //request contains eventArray from inject_button.js

				http.send(params);
			}
			chrome.tabs.create({ url: "https://calendar.google.com" }); //link to calendar
		});
  });
