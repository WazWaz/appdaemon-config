Simple interface to Google Calendar to show and agenda-style view of multiple calendars:

![Example Calendar](images/example-gcal.png)

And example is in `dashboards`.

Features are:

* Any number of subscribed Google Calendars
* All-day and timed events
* Scrolling area (that ugly scrollbar isn’t there on a mobile device)
* Configurable colors/css for each calendar and for past vs upcoming events
* Configurable update interval
* Configurable number of days forward
* Tap events to see details (end time, description, location)

Note that you need to set up your own Google Calendar API key and ClientID. Go to the [Credentials Section of the Google API Console](https://console.developers.google.com/apis/credentials), and create an APIKEY and an OAuth Client ID for a Web Application, then ensure that the Authorised JavaScript Origins includes your HASSIO, noting that it can’t be an IP address or hostname (but note that you can use a [local DNS on your homeassistant server](https://www.home-assistant.io/addons/dnsmasq/) or [xip.io](xip.io) to make an IP address look like a hostname).

Also note that the Google Calendar API complains if it considers your web browsers is a “WebView” and will not let you authorized. If you’re using such a browser (and trust it), you’ll probably find it has the ability to use different User Agent strings. The Fully Kiosk Browser that I use for displaying this calendar needs this for example.