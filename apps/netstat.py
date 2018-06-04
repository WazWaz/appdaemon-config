import appdaemon.plugins.hass.hassapi as hass
from datetime import datetime
import requests
import re
import math

from html.parser import HTMLParser

import xml.etree.ElementTree as ET
#
# NetStat App
#   Grabs router interface table and outputs chart data
# Args:
#   entity - where to set output data ("appdaemon.bandwidth_data")
#   url - the URL of the net stats on your router
#   auth - tuple of username, password
#   updateInterval - update interval in seconds (30)
#   samples - number of samples to keep (32)
#   logbase - take this logarithm base of each sample (1)
#   divisor - divide samples by this (1000)
#   max - clip values to this maximum value (1000000)

class IfRec:
  name = ""
  tx = 0
  rx = 0
  rate = 0

class MyHTMLParser(HTMLParser):
  interfaces = []
  ifcname = ""
  ifrow = [] # Bytes 	Packects 	Errors 	Drops 	Bytes 	Packects 	Packects 	Packects 	Bytes 	Packects 	Errors 	Drops 	Bytes 	Packects 	Packects 	Packects
  def handle_starttag(self, tag, attrs):
    if tag == "tr":
      self.ifcname = "pending"
      self.ifrow = []

  def handle_endtag(self, tag):
    if tag == "tr" and self.ifcname != "pending":
      rec = IfRec()
      rec.name = self.ifcname
      rec.tx = self.ifrow[0]
      rec.rx = self.ifrow[8]
      self.interfaces.append(rec)

  def handle_data(self, data):
    if self.ifcname == "pending":
      search = re.search(r'(eth[0-9]|wl[0-9]$)', data)
      if search:
        self.ifcname = search.group(1)
    elif data.isnumeric():
      self.ifrow.append(int(data))

class NetStat(hass.Hass):
  previous_interfaces = []
  history = []

  def initialize(self):
    self.url = self.args["url"]
    self.auth = tuple(self.args["auth"])
    try:
      self.entity = self.args["entity"]
    except:
      self.entity = "appdaemon.bandwidth_data"
    try:
      self.updateInterval = float(self.args["updateInterval"])
    except:
      self.updateInterval = 30
    try:
      self.samples = int(self.args["samples"])
    except:
      self.samples = 32
    try:
      self.logbase = float(self.args["logbase"])
    except:
      self.logbase = 1
    try:
      self.divisor = float(self.args["divisor"])
    except:
      self.divisor = 1000
    try:
      self.max = float(self.args["max"])
    except:
      self.max = 1000000
    self.previous = datetime.now()
    self.run_every(self.pollrouter, self.previous, self.updateInterval)

  def pollrouter(self, kwargs):
    r = requests.get(self.url, auth=self.auth)
    parser = MyHTMLParser()
    parser.interfaces = []
    parser.feed(r.text)
    time = (datetime.now() - self.previous).total_seconds()
    hrec = {}
    labels = []
    for idx, prec in enumerate(self.previous_interfaces):
      rec = parser.interfaces[idx]
      if rec.rx < prec.rx or rec.tx < prec.tx:
        continue
      total = (rec.rx-prec.rx) + (rec.tx-prec.tx) # eg. 100MB every 10s
      rate = round(total / time / self.divisor, 1) # 10000 kBps
      if rate < 1:
        rate = 0
      else:
        rate = math.log(rate, self.logbase)
      if rate > math.log(self.max, self.logbase):
        rate = math.log(self.max, self.logbase)
      if len(self.history) <= idx:
        self.history.append([])
      self.history[idx].append(rate)
      labels.append(rec.name)
    self.previous_interfaces = parser.interfaces[:]
    self.previous = datetime.now()
    for h in self.history:
      if len(h) > self.samples:
        del h[0]
    self.set_app_state(self.entity, state = { "series": self.history, "labels": labels })
