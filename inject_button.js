//Content script to insert "Export" button into Schedule Builder page
//Scrapes data from Schedule builder and forms a request in compliance with the Google Calendar API, and sends this data to export.js


//Create a button inline with the original Schedule Builder buttons 
var div = document.createElement("div");
var open = false, exported = false; //Track if the popup window is open, and if exporting has been completed 
div.className = "dropdown inline";
var button = document.createElement("button");
button.className = "btn btn-mini white-on-navyblue";  
button.addEventListener("click", parseAndExport);
var text = document.createTextNode("Export!");
button.appendChild(text);
div.appendChild(button);

var parent = document.getElementsByClassName("menu active")[0]; //parent: the element we want to insert the button as a child of
if(!parent) { //The original page changes class depending on window size so check if the one we are trying to access is null, if so try the other one
	parent = document.getElementsByClassName("menu active")[1];
}

//Insert the button
parent.appendChild(div);

div.className = "dropdown inline open";
var popupWindow = document.createElement("div");

popupWindow.className = "dropdown-menu defaultcase pull-right";
popupWindow.style.textAlign = "center";

//Parses text from Schedule Builder and exports to Google Calendar
function parseAndExport() {

	  if(!open) { //If the popup is not already open...
	  	open = true;
	  	if(!exported){ //And we haven't already exported
	  		//Add the popup to the page
			div.appendChild(popupWindow);
			popupWindow.innerHTML = '<h3 style="text-align:center;border-bottom:2px solid gold">Ready To Export!</h3><br><p>NOTE: You must sign in to Chrome (not Google) for the extension to work. </p><p style="text-align:left">How many weeks will your courses last?</p>' +
				'<input type="number" value=11 id="numweeks"><br><br><p style="text-align:left">Pick the <em>Monday</em> of the week when classes begin.</p><input type="date" id="startdate">';
			$('.dropdown-menu').css({"padding": "30px"});
			 
	
			var eventArray = []; //stores "events" in correct JSON format for Google Calendar requests
			var dataArray = []; //stores parsed data from Schedule Builder
			var TBA = false; //Some course times may be listed as TBA
			var OLA = false; //Some courses have no times and are listed as Online Learning Activities

			var calendarEvent;
			var courseContainer = document.getElementById("SavedSchedulesListDisplayContainer");
			var courses = courseContainer.getElementsByClassName("CourseItem"); //Element containing all courses in the schedule
			var events, data, parsedName, parsedTime, parsedDays, parsedLocation, text;
			var count = 0;
			for(var i = 0; i < courses.length; i++) { //For each course listing
				events = courses[i].getElementsByClassName("data meeting-times")[0].childNodes; 
				courseName = courses[i].getElementsByClassName("classTitle")[0].textContent;

			for(var j = 0; j < events.length; j++) { //For each "event" in the course (Lecture, Lab, Discussion...)
					TBA = false;
					OLA = false;
					data = events[j].childNodes; //Contains text to parse out name, time, days, location of the event
					var eventData = {courseName: "", eventName: "", time: "", days: "",location: ""};
					eventData.courseName = courseName;
					count = 0;
					for(var k = 0; k < data.length; k++) {
						text = data[k].textContent;
						if(text.includes("TBA")){
							TBA = true;
						}
						if(text.includes("Online Learning Activity")){
							OLA = true;
						}
						if(/\S/.test(text)) { //Checks that text is not all whitespace
							//Store parsed data
							if(count == 0) {
								eventData.eventName = text;
							}
							else if(count == 1) {
								eventData.time = text; 
							}
							else if(count == 2) {
								eventData.days = text;
							}
							else if(count == 3) {
								eventData.location = text;
							}
							else {
								break;
							}
							count++;
						}
					}
					if(!TBA && !OLA) {
						dataArray.push(eventData);
					}
					else if (TBA){
						//Note that TBA courses will not be exported
						popupWindow.innerHTML +=  '<p style="text-align:left;font-size:10px">(NOTE: ' + courseName.substr(0,10) + "... " + eventData.eventName + ' course time is TBA. Will not be exported.)</p>';
					}
					else if (OLA) {
						//Note that Online Learning Activities will not be exported
						popupWindow.innerHTML +=  '<p style="text-align:left;font-size:10px">(NOTE: ' + courseName.substr(0,10) + "... " + eventData.eventName + ' is an Online Learning Activity and does not have a course time. Will not be exported.)</p>';
					}
				}

			}
			//Add "Go" button
			var submit = document.createElement("button");
				submit.className = "btn btn-mini white-on-navyblue"; 
				submit.textContent = "Go!";
				submit.addEventListener("click", function() {
					var numWeeks = document.getElementById("numweeks").value;
					var startDate = document.getElementById("startdate").value; //We can calculate the start date of each individual course given the week the quarter begins

					//parse date elements
					var date = startDate.split('-');
					var year = date[0];
					var month = date[1]-1; //Dates are 0-indexed
					var day = date[2];

					for(var i = 0; i < dataArray.length; i++) {

						 //create a Google Calendar "event" object using Schedule Builder data
						 calendarEvent = createEvent(year, month, day, numWeeks, dataArray[i].courseName, dataArray[i].eventName, dataArray[i].time, dataArray[i].days, dataArray[i].location);
						 eventArray.push(calendarEvent);
					}
					exportToGoogle(eventArray);
				});
				popupWindow.appendChild(submit);
			}
		  else {
		  	div.appendChild(popupWindow);
		  	document.innerHTML = "Calendar exported.";
		  }
		}
		else {
			open = false;
			div.removeChild(popupWindow);

		}
}
function createEvent(year, month, day, numWeeks, courseName, parsedName, parsedTime, parsedDays, parsedLocation) {

	//convert AM/PM time into 24-hr
	var splitTime = parsedTime.split('-'); //Split into start/end times
	var startAMPM = splitTime[0].trim(); //Start time in AM/PM format
	var startAMPMStr = startAMPM.match(/\s(.*)$/)[1];
	var endAMPM = splitTime[1].trim(); 
	var endAMPMStr = endAMPM.match(/\s(.*)$/)[1];
	var start = {
		hours: Number(startAMPM.match(/^(\d+)/)[1]), 
		minutes: Number(startAMPM.match(/:(\d+)/)[1])
	};
	if(startAMPMStr == "PM" && start.hours < 12) {
		start.hours += 12;
	}
	if(startAMPMStr == "AM" && start.hours == 12) {
		start.hours = 0;
	}
	var end = {
		hours: Number(endAMPM.match(/^(\d+)/)[1]), 
		minutes: Number(endAMPM.match(/:(\d+)/)[1])
	};
	if(endAMPMStr == "PM" && end.hours < 12) {
		end.hours += 12;
	}
	if(endAMPMStr == "AM" && end.hours == 12) {
		end.hours = 0;
	}

	var days = toBYDAY(parsedDays); //convert into correct format for RRULE
	var startDateTime = new Date(year, month, day, start.hours, start.minutes); //Default start/end date to the Monday the user selected
	var endDateTime = new Date(year, month, day, end.hours, end.minutes);
	//Calculate the correct starting date for each class depending on it's first meeting day.
	//e.g. if a course meets Tuesday, we add one day to the original starting day (monday)
	switch(parsedDays[0]){
		case 'M':
			break;
		case 'T':
			startDateTime.setDate(startDateTime.getDate() + 1);
			endDateTime.setDate(endDateTime.getDate() + 1);
			break;
		case 'W':
			startDateTime.setDate(startDateTime.getDate() + 2);
			endDateTime.setDate(endDateTime.getDate() + 2);
			break;
		case 'R':
			startDateTime.setDate(startDateTime.getDate() + 3);
			endDateTime.setDate(endDateTime.getDate() + 3);
			break;
		case 'F':
			startDateTime.setDate(startDateTime.getDate() + 4);
			endDateTime.setDate(endDateTime.getDate() + 4);
			break;	
	}

	//Date the event will run until (start date + numWeeks weeks)
	var newDate = new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate(), end.hours, end.minutes);

	var untilDate = addDays(newDate, numWeeks*7);

	var endMonth = untilDate.getMonth();
	var endDay = untilDate.getDay();
  	if(endMonth+1 < 10){
		endMonth = "0" + "" + (endMonth+1);
	}
	else{
		endMonth = endMonth+1;
	}
	var endDay = untilDate.getDate();
	if(endDay < 10){
		endDay = "0" + "" + endDay;
	}
	console.log(untilDate.getFullYear() + "" + endMonth + "" + endDay);
	//Format the calendar event into a proper request
	var event = {
		 "kind": "calendar#event",
	     "summary": courseName + " " + parsedName,
		 "location": parsedLocation,
		 "start": {
		    "dateTime": startDateTime.toISOString(),
	        'timeZone': 'America/Los_Angeles'
		  },
		 "end": {
		   "dateTime": endDateTime.toISOString(),
	       'timeZone': 'America/Los_Angeles'
		 },
		 "recurrence": [
		   "RRULE:FREQ=WEEKLY;UNTIL=" + untilDate.getFullYear() + "" + endMonth + "" + endDay + ";BYDAY=" + days
		 ],
	};
	return event;
}
function addDays(date, days) {
 	 var out = new Date(date.getTime());
 	 out.setDate(date.getDate() + days);
 	 return out;
 }
function numDays(year, month) {
	return new Date(year, month, 0).getDate();
}
function exportToGoogle(eventArray) {

	//Content scripts cannot use chrome.* API (for authorization), so send data to an event page
	chrome.runtime.sendMessage(eventArray, function(response) {
		popupWindow.innerHTML = 'Calendar exported.';
		exported = true;
	});
}
function toBYDAY(parsedDays) {
	var days = "";
	for(var i = 0; i < parsedDays.length; i++){
		if(i != 0) {
			days += ",";
		}
		switch(parsedDays[i]) {
			case 'M':
				days +="MO";
				break;
			case 'T':
				days +="TU";
				break;
			case 'W':
				days +="WE";
				break;
			case 'R':
				days +="TH";
				break;
			case 'F':
				days +="FR";
				break;
		}
	}
	return days;
}

window.onresize = function(event) {
	console.log("resize");
    parent = document.getElementsByClassName("menu active")[0];
	if(!parent) {
		parent = document.getElementsByClassName("menu active")[1];
	}
	parent.appendChild(div);
};