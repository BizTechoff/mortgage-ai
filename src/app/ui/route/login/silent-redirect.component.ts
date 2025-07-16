// silent-redirect.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  template: '' // אין צורך בתצוגה
})
export class SilentRedirectComponent implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // בצע הפניה לדף הלוגין תוך שמירה על כל הפרמטרים המקוריים
    this.router.navigate(['/login'], { 
      queryParamsHandling: 'preserve' 
    });
  }
}
