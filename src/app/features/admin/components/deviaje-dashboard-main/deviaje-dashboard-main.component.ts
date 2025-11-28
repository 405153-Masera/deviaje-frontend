// dashboard-main.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardSummaryResponse } from '../../dashboard/models/dashboards';
import { DashboardService } from '../../dashboard/services/dashboard.service';

@Component({
  selector: 'app-dashboard-main',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-dashboard-main.component.html',
  styleUrls: ['./deviaje-dashboard-main.component.scss']
})
export class DeviajeDashboardMainComponent {
 
}