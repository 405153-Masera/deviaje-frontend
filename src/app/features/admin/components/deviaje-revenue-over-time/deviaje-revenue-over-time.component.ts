// deviaje-revenue-over-time.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-deviaje-revenue-over-time',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-revenue-over-time.component.html',
  styleUrls: ['./deviaje-revenue-over-time.component.scss']
})
export class DeviajeRevenueOverTimeComponent{
  
}