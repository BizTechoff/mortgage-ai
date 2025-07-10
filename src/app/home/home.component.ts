import { Component, OnInit } from '@angular/core'
import { Fields, getFields } from 'remult'
import { DataAreaSettings } from '../common-ui-elements/interfaces'
import { Router } from '@angular/router'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
console.log('HomeComponent: ' + this.router.url)}
}
