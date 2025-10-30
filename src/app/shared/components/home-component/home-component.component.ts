import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrendingDestinationsComponent } from "../deviaje-trending-destinations/deviaje-trending-destinations.component";

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, RouterLink, TrendingDestinationsComponent],
  templateUrl: './home-component.component.html',
  styleUrls: ['./home-component.component.scss']
})
export class HomeComponentComponent {

  isLoading = true;

  customCities = [
    { name: 'París', country: 'Francia' },
    { name: 'Nueva York', country: 'EE.UU.' },
    { name: 'Tokio', country: 'Japón' },
    { name: 'Roma', country: 'Italia' },
    { name: 'Londres', country: 'Reino Unido' },
    { name: 'Barcelona', country: 'España' },
    { name: 'Río de Janeiro', country: 'Brasil' },
    { name: 'Buenos Aires', country: 'Argentina' }
  ];
}
