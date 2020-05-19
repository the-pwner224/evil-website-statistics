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


// code begins execution at very bottom of this file
// javascript is stupid


function getDom(name) { return document.getElementById(name); };
function hideElement(e) { e.style.display = "none"; };
function hide(e) { hideElement(getDom(e)); };

// Functions to convert evilness/tristate/etc. values from the database into
//   values to be used by the UI.
// When rating evilness, the UI uses 0/1/2/3 for ?/not/slightly/very evil
// When rating goodness (for 2fa), the UI uses 0/1/-1 for ?/yes/no good

var evilCaptchaProviders = ["recaptcha"];
function captchaEvilnessToUiEvilness(captchaEvilness, captchaProvider) {
	// recaptcha upgrades 2 (required after many requests) to 3 (always required)
	if (captchaEvilness == 2)
		return 2 + (evilCaptchaProviders.includes(captchaProvider) ? 1 : 0);
	return captchaEvilness;
};
function emailEvilnessToUiEvilness(emailEvilness) {
	// 1,2   3   4,5 => 1,2,3
	return { 0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 3 }[emailEvilness];
};
function twofaTristateToUiGoodness(twofaTristate) {
	return twofaTristate;
}


function setEvilUi(evilness, textElement, bgElement, numQuestionMark, numExclamationMark) {
	var q = "?".repeat(numQuestionMark);
	var exc = "!".repeat(numExclamationMark);
	switch (evilness) {
		case 0:
			bgElement.style.backgroundColor = "#444";
			textElement.innerHTML = q + " " + textElement.innerHTML + " " + q;
			textElement.style.color = "#888";
			break;
		case 1:
			break;
		case 2:
			bgElement.style.backgroundColor = "#555";
			textElement.innerHTML = exc + " " + textElement.innerHTML + " " + exc;
			textElement.style.color = "#fff";
			break;
		case 3:
			bgElement.style.backgroundColor = "#f00";
			textElement.innerHTML = exc + " " + textElement.innerHTML + " " + exc;
			textElement.style.color = "#fff";
			break;
	}
};

function setGoodUi(goodness, textElement, bgElement, numQuestionMark) {
	var q = "?".repeat(numQuestionMark);
	switch (goodness) {
		case -1:
			break;
		case 0:
			bgElement.style.backgroundColor = "#444";
			textElement.innerHTML = q + " " + textElement.innerHTML + " " + q;
			textElement.style.color = "#888";
			break;
		case 1:
			bgElement.style.backgroundColor = "#0a0";
			textElement.style.color = "#fff";
			break;
	}
};


function error() {
	getDom("notFoundNotice").innerHTML = "Error loading database!";
};



function finishCompletePopup(db, baseDomain, tld) {
	var info = db[baseDomain];
	var foundInDb = false;

	if (info != undefined) {
		if (info.tlds.includes(tld))
			foundInDb = true;
		if (info.tlds.length == 1 && info.tlds[0] == "*")
			foundInDb = true;
	}

	var p = getDom("notFoundNotice");
	if (!foundInDb) {
		// hide everything except the domain name and that it wasn't found in DB
		// then return
		let children = p.parentNode.children;
		for (let i = 0; i < children.length; ++i)
			hideElement(children[i]);
		getDom("domain").style.display = "block";
		getDom("lastDbUpdateTime").style.display = "block";
		getDom("forceDbUpdateButton").style.display = "block";
		p.style.display = "block";
		p.innerHTML = "<b>" + p.innerHTML + "</b>";
		p.style.color = "#f33";
		return;
	} else {
		// if was found, then hide the message that says it wasn't found
		hideElement(p);
	}

	var captchaInfo = info["captcha"];
	var captchaEvilnesses = [];
	var captchaTypes = ["access", "login", "signup", "action", "other"];
	var captchaProvider = captchaInfo["provider"];
	var captchaTds = getDom("captcha-tr").children;

	for (let i = 0; i < captchaTypes.length; ++i) {
		let captchaEvilness = captchaEvilnessToUiEvilness(captchaInfo[captchaTypes[i]], captchaProvider);
		captchaEvilnesses.push(captchaEvilness);
		setEvilUi(captchaEvilness,
			captchaTds[i],
			captchaTds[i],
			1,
			0);
	}

	setEvilUi(Math.max(...captchaEvilnesses),
		getDom("captcha-th"),
		getDom("captcha-thead"),
		0,
		3);

	if (captchaProvider != "") {
		let src = browser.runtime.getURL("providerIcons/" + captchaProvider + ".png");
		let imgHtml = "<img src=\"" + src + "\" />";
		let newHtml = " ( " + imgHtml + " " + captchaProvider + " " + imgHtml + " )";
		getDom("captcha-th").innerHTML += newHtml;
	}

	var captchaNotes = captchaInfo["notes"];
	if (captchaNotes != "") {
		getDom("notes-captcha").innerHTML = captchaNotes;
	} else {
		hide("notes-captcha-title");
		hide("notes-captcha-hr");
		hide("notes-captcha");
	}


	var emailInfo = info["email"];

	setEvilUi(emailEvilnessToUiEvilness(emailInfo["email"]),
		getDom("email-th"),
		getDom("email-table"),
		3,
		3);

	var emailNotes = emailInfo["notes"];
	if (emailNotes != "") {
		getDom("notes-email").innerHTML = emailNotes;
	} else {
		hide("notes-email-title");
		hide("notes-email-hr");
		hide("notes-email");
	}


	var twofaInfo = info["2fa"];
	var twofaGoodnesses = [];
	var twofaTypes = ["sms", "email", "proprietary", "open"];
	var twofaRequireds = twofaInfo["required"].split(" ");
	var twofaProvider = twofaInfo["proprietaryType"];
	var twofaNotes = twofaInfo["notes"];
	var twofaTds = getDom("2fa-tr").children;

	for (let i = 0; i < twofaTypes.length; ++i) {
		let twofaGoodness = twofaTristateToUiGoodness(twofaInfo[twofaTypes[i]]);
		twofaGoodnesses.push(twofaGoodness);
		setGoodUi(twofaGoodness,
			twofaTds[i],
			twofaTds[i],
			1);
	}

	if (twofaRequireds.length > 0) {
		getDom("2fa-th").innerHTML += " Required";
	}

	setGoodUi(Math.max(...twofaGoodnesses),
		getDom("2fa-th"),
		getDom("2fa-thead"),
		0);

	if (twofaProvider != "") {
		let src = browser.runtime.getURL("providerIcons/" + twofaProvider + ".png");
		let imgHtml = "<img src=\"" + src + "\" />";
		let newHtml = " ( " + imgHtml + " " + twofaProvider + " " + imgHtml + " )";
		getDom("2fa-th").innerHTML += newHtml;
	}

	if (twofaNotes != "") {
		getDom("notes-2fa").innerHTML = twofaNotes;
	} else {
		hide("notes-2fa-title");
		hide("notes-2fa-hr");
		hide("notes-2fa");
	}


	if (captchaNotes == "" && emailNotes == "" && twofaNotes == "") {
		hide("notes-title");
	}
};



// this function is invoked from the code at the very bottom of the file
function completePopup(response) {
	// gets a response from the content script like:
	// {
	//   "fullDomain": "www.google.com",
	//   "baseDomain": "google.com",
	// }
	// or
	// {
	//   "fullDomain": "www.google.co.uk",
	//   "baseDomain": "google.co.uk",
	// }

	// extract base domain ("google"), and TLD ("com", "co.uk")
	// might want to add subdomain-based filtering in the future
	// until that is implemented the fullDomain isn't really of any use

	var domainParts = response.baseDomain.split('.');
	var baseDomain = domainParts.shift();
	var tld = response.baseDomain.slice(baseDomain.length + 1);

	getDom("domain").innerHTML = tld + " ⇒ " + baseDomain;

	browser.storage.local.get("db").then((data) => finishCompletePopup(data.db, baseDomain, tld), error);

	function updateLastRefreshTime(data) {
		let diff = Math.abs(new Date() - data.lastRefreshTime) / 1000;
		var hours = diff / (60*60); var minutes = diff / 60; var seconds = diff;

		var displayTime = 0;
		var displayUnit = "";
		if (hours >= 0.75) {
			displayTime = Math.round(hours);
			displayUnit = displayTime == 1 ? "hour" : "hours";
		} else if (minutes > 0.75) {
			displayTime = Math.round(minutes);
			displayUnit = displayTime == 1 ? "minute" : "minutes";
		} else {
			displayTime = Math.round(seconds);
			displayUnit = displayTime == 1 ? "second" : "seconds";
		}
		getDom("lastDbUpdateTime").innerHTML =
			"Last database update: " + displayTime + " " + displayUnit + " ago";
	};
	browser.storage.local.get("lastRefreshTime").then(updateLastRefreshTime);

	function forceUpdate() {
		hide("forceDbUpdateButton");
		browser.runtime.sendMessage({});
	};
	getDom("forceDbUpdateButton").onclick = forceUpdate;
};


// when popup is loaded:
//   query for the active tab
//   send it an empty message
//   run completePopup() with the response
browser.tabs.query({ active: true, currentWindow: true })
	.then(tabs => browser.tabs.sendMessage(tabs[0].id, {}))
	.then(completePopup);
