/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  constructor(iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) {
    iconRegistry.addSvgIcon
      ('monitor', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/monitor.svg'));
    iconRegistry.addSvgIcon
      ('ic_clear_black_24px', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_clear_black_24px.svg'));
    iconRegistry.addSvgIcon
      ('ic_chevron_right_black_24px', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_chevron_right_black_24px.svg'));
    iconRegistry.addSvgIcon
      ('ic_open_tab', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_open_tab.svg'));
    iconRegistry.addSvgIcon
      ('ic_cancel_circle', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_cancel_circle.svg'));
    iconRegistry.addSvgIcon
      ('ic_magnify_search', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_magnify_glass_48px.svg'));
    iconRegistry.addSvgIcon
      ('power_icon', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_power_settings_new_black_48px.svg'));
    }

}

