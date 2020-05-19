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


// http://rossscrivener.co.uk/blog/javascript-get-domain-exclude-subdomain
// Clever way to get the domain, excluding subdomain
// Will return google.com for both http://www.google.com and http://google.com
// And google.co.uk for http://www.google.co.uk, http://google.co.uk
var domain = (function(){
   var i=0,domain=document.domain,p=domain.split('.'),s='_gd'+(new Date()).getTime();
   while(i<(p.length-1) && document.cookie.indexOf(s+'='+s)==-1){
      domain = p.slice(-1-(++i)).join('.');
      document.cookie = s+"="+s+";domain="+domain+";";
   }
   document.cookie = s+"=;expires=Thu, 01 Jan 1970 00:00:01 GMT;domain="+domain+";";
   return domain;
})();



// the popup window will ask for the domain
browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	return Promise.resolve({
		"fullDomain": window.location.hostname, // e.g. www.google.co.uk
		"baseDomain": domain // e.g. google.co.uk
	});
});


// and when this page is opened, message the background script so it can set the
//   browserAction icon (color)
browser.runtime.sendMessage({
	"fullDomain": window.location.hostname,
	"baseDomain": domain
});
