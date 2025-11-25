import { Component} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TrendingDestinationsComponent } from "../deviaje-trending-destinations/deviaje-trending-destinations.component";

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, RouterLink, TrendingDestinationsComponent],
  templateUrl: './deviaje-home.component.html',
  styleUrls: ['./deviaje-home.component.scss']
})
export class HomeComponentComponent {

}
