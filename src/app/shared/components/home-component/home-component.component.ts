import { Component } from '@angular/core';
import { DeviajeNavbarComponent } from "../deviaje-navbar/deviaje-navbar.component";

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [DeviajeNavbarComponent],
  templateUrl: './home-component.component.html',
  styleUrl: './home-component.component.scss'
})
export class HomeComponentComponent {

}
