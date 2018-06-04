function basechart(widget_id, url, skin, parameters)
{  
  self = this
  self.widget_id = widget_id
  self.parameters = parameters
  self.pending = 0

  if ("labels" in self.parameters)
  {
    self.labels = self.parameters.labels
  }

  if ("ticks" in self.parameters)
  {
    self.ticks = self.parameters.ticks
  } else {
    self.ticks = self.ticks[0, 20, 40, 60, 80, 100]
  }

  if ("logbase" in self.parameters)
  {
    self.logbase = self.parameters.logbase
  } else {
    self.logbase = 1
  }

  if (self.logbase != 1) {
    var llb = Math.log(self.logbase)
    self.ticks.forEach(function(t, index) { self.ticks[index] = t == 0 ? 0 : Math.log(t) / llb })
  }

  if ("monitored_entity" in self.parameters)
  {
      entity = self.parameters.monitored_entity
  }
  else
  {
      entity = self.parameters.entity
  }

  var callbacks = []
  
  self.OnStateAvailable = OnStateAvailable
  self.OnStateUpdate = OnStateUpdate

  var monitored_entities =
      [
          {"entity": entity, "initial": self.OnStateAvailable, "update": self.OnStateUpdate}
      ]

  WidgetBase.call(self, widget_id, url, skin, parameters, monitored_entities, callbacks)  

  $.getScript("//cdn.jsdelivr.net/chartist.js/latest/chartist.min.js", (function(self){return function(){MakeChart(self)}}(self)))

  function MakeChart(self)
  {
    self.chart = new Chartist.Line('.ct-chart',null,
    {
      fullWidth: true,
      showPoint: false,
      showArea: false,
      chartPadding: {
        right: 20,
        left: -40,
        top: 0,
        bottom: -30
      },
      axisX: {
        showGrid: false,
        labelInterpolationFnc: function(value) {
          return "";
        }
      },
      axisY: {
        type: Chartist.FixedScaleAxis,
        labelOffset: { x: 43, y: 4.5 },
        low: 0,
        high: Math.log(10000)/Math.log(self.logbase),
        ticks: self.ticks,
        labelInterpolationFnc: (function (logbase) { return function(value) {
          if (logbase != 1)
            value = Math.pow(logbase, value)
          if (value > 1000000)
            return Math.round(value / 1000000)+"G";
          if (value >= 1000)
            return (Math.round(value / 100)/10)+"M";
          if (value <= 1)
            return ""; // otherwise "0" is clipped.
          return Math.round(value)+"k";
        }})(self.logbase),
      },
      plugins: [
        ctSeriesLineLabels(self)
      ]
    });
  }

      // The StateAvailable function will be called when
    // self.state[<entity>] has valid information for the requested entity
    // state is the initial state

    function OnStateAvailable(self, state)
    {
      self.state = state.state;

      // Create a new line chart object where as first parameter we pass in a selector
      // that is resolving to our chart container element. The Second parameter
      // is the actual data object.

      if (self.chart)
        self.chart.update(self.state)
    }

    // The OnStateUpdate function will be called when the specific entity
    // receives a state update - its new values will be available
    // in self.state[<entity>] and returned in the state parameter

    function OnStateUpdate(self, state)
    {
      self.state = state.state;
      if (self.chart) {
        self.chart.update(self.state)
      }
    }

    function ctSeriesLineLabels(self, options) {
      return function ctSeriesLineLabels(chart) {
        var defaultOptions = {
          labelClass: 'ct-slice-donut-solid',
          labelOffset: {
            x: 12,
            y: 4
          },
          textAnchor: 'middle; font-size: 8px'
        };
    
        options = Chartist.extend({}, defaultOptions, options);
    
        if(chart instanceof Chartist.Line) {
          chart.on('draw', (function(self, chart){return function(data) {
            if(data.type === 'line') {
              var last = data.path.pathElements[data.path.pathElements.length-1];
              data.group.elem('text', {
                x: last.x2 + options.labelOffset.x,
                y: last.y2 + options.labelOffset.y,
                style: 'text-anchor: ' + options.textAnchor
              }, options.labelClass).text(self.labels ? self.labels[data.seriesIndex] : chart.data.labels[data.seriesIndex]);
            }
          }})(self, chart));
        }
      }
    }

}