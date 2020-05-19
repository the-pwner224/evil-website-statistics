//  Copyright 2020  the_pwner224 <the_pwner224@fastmail.com>
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.


// background script, runs permanently while the extension is installed
// code starts at the very bottom of this file

var hoursBetweenRefresh = 6; // needs to go up as database growth flattens
var dbUrl = "https://raw.githubusercontent.com/the-pwner224/evil-website-statistics/master/db.json";

if (true) { // for testing
	hoursBetweenRefresh = 0.0003; // 1 second
	dbUrl = "http://localhost:8080/db.json";
}

var refreshTimeMinutes = hoursBetweenRefresh*60;
var refreshTimeMilliseconds = refreshTimeMinutes*60*1000;


var evilCaptchaProviders = ["recaptcha"];


// Load the DB JSON from the URL. If successful:
// JSON.parse it, put it into storage["db"], update storage["lastRefreshTime"]
function refreshDB() {
	console.log("refreshing");
	var xhr = new XMLHttpRequest();
	xhr.addEventListener("load", function() {
		if (xhr.status == 200) {
			browser.storage.local.set({ "db": JSON.parse(xhr.response) });
			browser.storage.local.set({ "lastRefreshTime": new Date() });
			console.log("refreshed");
		}
	});
	xhr.open("GET", dbUrl);
	xhr.send();
}



// when the background script is started, call refreshDB() if the timeout
//   between refreshes has elapsed, or if the DB has never been loaded
function refreshDBIfNecessary(data) {
	var lastRefreshTime = data.lastRefreshTime;

	if (lastRefreshTime == undefined) { // not in storage yet
		refreshDB();
	} else { // or more than 24 hours old
		var now = new Date();
		var yesterday = now - refreshTimeMilliseconds;
		if (lastRefreshTime <= yesterday)
			refreshDB();
	}
}

function finishUpdateBrowserAction(db, baseDomain, tld, tabId) {
	var info = db[baseDomain];
	var foundInDb = false;

	if (info != undefined) {
		if (info.tlds.includes(tld))
			foundInDb = true;
		if (info.tlds.length == 1 && info.tlds[0] == "*")
			foundInDb = true;
	}

	if (!foundInDb) {
		browser.browserAction.setIcon({
			path: "icons/questionMark.png",
			tabId: tabId
		});
	}

	// show warning if any captcha is 3 (or 2 with recaptcha) or if email is 4/5
	var warn = false;

	if (info.email.email > 3) {
		warn = true;
	} else {
		let captchaTypes = ["access", "login", "signup", "action", "other"];
		let captchaProvider = info.captcha.provider;
		for (let i = 0; i < captchaTypes.length; ++i) {
			let captchaLevel = info.captcha[captchaTypes[i]];
			if (captchaLevel > 2
				|| (captchaLevel < 1
					&& evilCaptchaProviders.includes(captchaProvider))) {
				warn = true;
				break;
			}
		}
	}

	if (warn) {
		browser.browserAction.setIcon({
			path: "icons/red.png",
			tabId: tabId
		});
	} else {
		browser.browserAction.setIcon({
			path: "icons/gray.png",
			tabId: tabId
		});
	}
};

function updateBrowserAction(domainData, tabId) {
	var domainParts = domainData.baseDomain.split('.');
	var baseDomain = domainParts.shift();
	var tld = domainData.baseDomain.slice(baseDomain.length + 1);

	browser.storage.local.get("db").then((data) => finishUpdateBrowserAction(data.db, baseDomain, tld, tabId));
};





// background thread started
// check if database exists; refresh if the check failed
// after checking if it exists, refresh it if it does not exist, or if last
//   refresh was more than [xxx] hours ago
browser.storage.local.get("lastRefreshTime").then(refreshDBIfNecessary, refreshDB);

// and start a timer for periodic refresh
browser.alarms.create({ periodInMinutes: refreshTimeMinutes });
browser.alarms.onAlarm.addListener(refreshDB);

// the popup will message this when the refresh button is clicked
// the content script will also send a message to tell this script to set the
//   browserAction icon (color)
function onMsg(msg, sender, sendResponse) {
	if (msg.baseDomain != undefined) // from content script
		updateBrowserAction(msg, sender.tab.id);
	else // from popup
		refreshDB();
};
browser.runtime.onMessage.addListener(onMsg);
