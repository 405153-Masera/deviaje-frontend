import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DeviajeSidebarComponent } from '../deviaje-sidebar/deviaje-sidebar.component';
import { DeviajeNavbarComponent } from '../deviaje-navbar/deviaje-navbar.component';
import { DeviajeFooterComponent } from '../deviaje-footer/deviaje-footer.component';

@Component({
  selector: 'app-deviaje-main-layout',
  standalone: true,
  imports: [RouterOutlet, DeviajeNavbarComponent, DeviajeSidebarComponent, DeviajeFooterComponent] ,
  templateUrl: './deviaje-main-layout.component.html',
  styleUrl: './deviaje-main-layout.component.scss'
})
export class DeviajeMainLayoutComponent {

  isSidebarOpen = false;

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
