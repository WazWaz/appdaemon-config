function basecalendar(widget_id, url, skin, parameters)
{  
  self = this
  self.widget_id = widget_id
  self.parameters = parameters
  self.pending = 0

  var callbacks = []
  var monitored_entities =  []
  
  WidgetBase.call(self, widget_id, url, skin, parameters, monitored_entities, callbacks)  

  self.updateinterval = 600 // 10 minutes.
  if ("updateinterval" in parameters)
  {
    self.updateinterval = parameters.updateinterval;
  }

  self.calendars = {}
  if ("calendars" in parameters)
  {
    self.calendars = parameters.calendars
  } else {
    self.calendars = {"primary":null}
  }

  if ("color" in parameters)
  {
    self.color = parameters.color
  }

  if ("line_style" in parameters)
  {
    self.line_style = parameters.line_style
  }

  if ("calendar_style" in parameters)
  {
    self.calendar_style = parameters.calendar_style
  }

  if ("colorpast" in parameters)
  {
    self.colorPast = parameters.colorpast
  }

  // Client ID and API key from the Developer Console
  self.CLIENT_ID = parameters.clientid
  self.API_KEY = parameters.apikey

  self.days = 3
  if ("days" in parameters)
    self.days = parameters.days

  $.getScript("https://apis.google.com/js/api.js",(function(self){return function(data, textStatus, jqxhr){handleClientLoad(self,data, textStatus, jqxhr)}})(self));

  self.lastTime = -1; 
  self.timerID = setInterval(updateCalendar, 1000, self);
  self.set_field(self, "calendar", "Starting...")

  function updateCalendar(self) 
  {
    if ('undefined' !== typeof gapi && 'undefined' !== typeof gapi.auth2 &&  'undefined' !== typeof gapi.client.calendar && gapi.auth2.getAuthInstance().isSignedIn.get()) {
      var d = new Date();
      var t = d.getTime();
      if (self.lastTime == -1 || t - self.lastTime > self.updateinterval || t < self.lastTime /* clock change */) {
        listUpcomingEvents(self)
        self.lastTime = d.getTime();
      }
    } else {
      self.set_field(self, "calendar", "Login to see calendar...")
    }
  }

  // Array of API discovery doc URLs for APIs used by the quickstart
  var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  var SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

  var authorizeButton = document.getElementById('authorize-button');
  var signoutButton = document.getElementById('signout-button');
  var backButton = document.getElementById('back-button');
  backButton.onclick = (function(self){return function(){OnBackButton(self)}})(self);
  self.calendar = $("#calendar")[0]
  self.event = $("#event")[0]

  /**
   *  On load, called to load the auth2 library and API client library.
   */
  function handleClientLoad(self,data, textStatus, jqxhr) {
    console.log( data ); // Data returned
    console.log( textStatus ); // Success
    console.log( jqxhr.status ); // 200
    console.log( "Load was performed." );

    gapi.load('client:auth2', (function(self){return function(){initClient(self)}})(self));
  }

  /**
   *  Initializes the API client library and sets up sign-in state
   *  listeners.
   */
  function initClient(self) {
    console.log( "Init1." );

    try {
      gapi.client.init({
        apiKey: self.API_KEY,
        clientId: self.CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      }).then(function () {
        // Listen for sign-in state changes.
        console.log( "Inited." );
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
        console.log( "Inited2." );
      },
      function(error) {
        ShowError(self, "Authorization error", error);
      });
    } catch (error) {
      ShowError(self,  "Auth error", error)
    }

    console.log( "Init2." );
  }

  /**
   *  Called when the signed in status changes, to update the UI
   *  appropriately. After a sign-in, the API is called.
   */
  function updateSigninStatus(isSignedIn) {
    console.log( "GC-USS" );

    if (isSignedIn) {
      authorizeButton.style.display = 'none';
      signoutButton.style.display = 'block';
    } else {
      authorizeButton.style.display = 'block';
      signoutButton.style.display = 'none';
    }
  }

  /**
   *  Sign in the user upon button click.
   */
  function handleAuthClick(event) {
    console.log( "GC-AU" );

    gapi.auth2.getAuthInstance().signIn();
  }

  /**
   *  Sign out the user upon button click.
   */
  function handleSignoutClick(event) {
    console.log( "GC-SO" );
    gapi.auth2.getAuthInstance().signOut();
  }

  /**
   * Print the summary and start datetime/date of the next ten events in
   * the authorized user's calendar. If no events are found an
   * appropriate message is printed.
   */
  function listUpcomingEvents(self) {
    console.log( "GC-lue" );

    if (self.pending > 0)
      return

    self.newEntries = [];

    var from = new Date();
    from.setHours(0,0,0,0);
    var to = new Date();
    to.setTime(to.getTime()+1000*60*60*24*self.days);
    self.pending = 0;
    var cal
    try {
      for (cal in self.calendars) {
        var cparam = self.calendars[cal]
        self.pending++;
        console.log("GET "+cal+" "+cparam.color)
        gapi.client.calendar.events.list({
          'calendarId': cal,
          'timeMin': from.toISOString(),
          'timeMax': to.toISOString(),
          'showDeleted': false,
          'singleEvents': true,
          'maxResults': 100,
          'fields': "items(id,colorId,start,end,summary,description,location)"
        }).then((function(self, lcal) {
          return function(response)
          {
          self.calendar.style.display = 'block'
          self.event.style.display = 'none'
      
          var events = response.result.items;
          if (events.length > 0) {
            for (var i=0; i<events.length; ++i) {
              var e = events[i]
              e.calendar = lcal
              self.newEntries.push(e)
            }
          }
          self.pending--;
          if (self.pending == 0) {
            var text ="<table>";
            var weekday = new Array(7);
            weekday[0] =  "Sunday";
            weekday[1] = "Monday";
            weekday[2] = "Tuesday";
            weekday[3] = "Wednesday";
            weekday[4] = "Thursday";
            weekday[5] = "Friday";
            weekday[6] = "Saturday";
            var today = new Date();
            today.setHours(0,0,0,0);
            var dayms = 1000*60*60*24;
            var date = -1;
            self.newEntries.sort(function(a,b){
              var awhen = a.start.dateTime;
              if (!awhen) awhen = a.start.date;
              var bwhen = b.start.dateTime;
              if (!bwhen) bwhen = b.start.date;
              //console.log(a.summary+" "+a.start.dateTime+"/"+a.start.date+"|"+awhen+" -> "+new Date(awhen))
              return (new Date(awhen)).getTime() - (new Date(bwhen)).getTime();
            });
            for (i=0; i<self.newEntries.length; ++i) {
              event = self.newEntries[i];
              var param = self.calendars[event.calendar]
              console.log(event.calendar+": "+param.color)
              var when = event.start.dateTime;
              if (!when) {
                when = event.start.date;
              }
              var whenend = event.end.dateTime
              if (!whenend) {
                whenend = event.end.date
              }
              var end = new Date(whenend)
              event.enddate = end
              var whendate = new Date(when)
              event.startdate = whendate
              var whendate0 = new Date(when)
              whendate0.setHours(0,0,0,0)
              if (date+dayms <= whendate0.getTime()) {
                date = whendate0.getTime()
                text += "<tr><th colspan=2 align=center class=dayheader>"
                if (whendate0.getTime() == today.getTime())
                  text += "Today"
                else if (whendate0.getTime() == today.getTime()+dayms)
                  text += "Tomorrow"
                else
                  text += weekday[whendate0.getDay()]
                text += "</th></tr>"
              }
              var time = whendate.getMinutes();
              if (time < 10) time = "0"+time;
              var hours = whendate.getHours();
              if (hours >= 12) {
                if (hours > 12) hours-=12;
                time = hours+":"+time+"pm";
              } else {
                time = hours+":"+time+"am";
              }
              var summary = event.summary
              var now = new Date()
              var color = self.color
              if (end < now) {
                color = self.colorPast
              } else {
                if (param && param.color) {
                  color = param.color
                }
              }
              if (color) {
                summary = "<font color=\""+color+"\">"+summary+"</font>";
              }
              text = text + "<tr><th class=timeheader>"+time+ "</th><td id=\""+event.id+"\">" + summary + "</td></tr>";
            }
            text = text + "</table>";
            self.set_field(self, "calendar", text);
            for (i=0; i<self.newEntries.length; ++i) {
              event = self.newEntries[i];
              var elem = $("#"+event.id)[0]
              elem.onclick = (function(self,event){return function(){OnEventClick(self,event)}})(self,event);
            }
          }
        }})(self,cal),
        function(error)
        {
          ShowError(self, "Calendar Error", error)
        });
      }
    } catch (error) {
      ShowError(self, "Calendar API Error", error)
    }
  }

  function ShowError(self,title,error)
  {
    console.log("Error: "+error)
    self.set_field(self, "event_summary", title)
    self.set_field(self, "event_location", "")
    self.set_field(self, "event_start", "")
    self.set_field(self, "event_end", "")
    self.set_field(self, "event_description", JSON.stringify(error))
    self.calendar.style.display = 'none'
    self.event.style.display = 'block'
    self.autoback = setInterval(OnBackButton, 6000000, self)
  }

  function OnEventClick(self,event)
  {
    self.set_field(self, "event_summary", event.summary)
    self.set_field(self, "event_location", event.location)
    self.set_field(self, "event_start", event.startdate.toLocaleString())
    self.set_field(self, "event_end", event.enddate.toLocaleString())
    self.set_field(self, "event_description", event.description)
    self.calendar.style.display = 'none'
    self.event.style.display = 'block'
    self.autoback = setInterval(OnBackButton, 10000, self)
  }

  function OnBackButton(self)
  {
    if (self.autoback) {
      clearInterval(self.autoback)
    }
    self.calendar.style.display = 'block'
    self.event.style.display = 'none'
  }
}