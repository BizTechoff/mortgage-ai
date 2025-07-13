// src/app/components/mortgage-request-update-status/mortgage-request-update-status.component.ts

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { RequestStatus } from '../../../../shared/enum/request-status.enum';

export interface UpdateStatusPayload {
  status: RequestStatus;
  rejectionReason?: string;
}

@Component({
  selector: 'app-mortgage-request-update-status',
  templateUrl: './mortgage-request-update-status.component.html',
  styleUrls: ['./mortgage-request-update-status.component.scss']
})
export class MortgageRequestUpdateStatusComponent implements OnInit {

  args: { request: MortgageRequest } = { request: undefined! }

  // --- Inputs & Outputs ---

  /**
   * The mortgage request object to be updated.
   * This is provided by the parent component.
   */
  @Input() request!: MortgageRequest;

  /**
   * Emits the new status payload when the user clicks 'Save'.
   * The parent component will listen to this event.
   */
  @Output() statusUpdated = new EventEmitter<UpdateStatusPayload>();

  /**
   * Emits when the user clicks 'Cancel'.
   */
  @Output() cancelled = new EventEmitter<void>();


  // --- Properties ---

  saved = false
  form!: FormGroup;
  // Expose enums and lists to the template
  requestStatuses = RequestStatus.getAllStatuses();
  RequestStatus = RequestStatus;

  constructor(private fb: FormBuilder, private dialog: MatDialogRef<any>) { }
  isFromOpenDialog = () => !!this.args?.request

  ngOnInit(): void {
    if (!this.args) {
      this.args = { request: undefined! }
    }
    if (this.args.request) {
      this.request = this.args.request
      console.log(this.request)
    }
    if (!this.request) {
      console.error("MortgageRequestUpdateStatusComponent requires a 'request' input.");
      return;
    }

    // Initialize the form with the current status of the request
    this.form = this.fb.group({
      status: [this.request.status, Validators.required],
      rejectionReason: [''] // Optional field
    });
  }


  /**
   * Compares two status objects to determine if they are the same.
   * Angular uses this function to set the initial selected value in the dropdown.
   */
  compareStatuses(s1: RequestStatus, s2: RequestStatus): boolean {
    // Return true if both objects exist and their IDs are the same.
    // The 's1 === s2' part handles cases where one or both are null/undefined.
    return s1 && s2 ? s1.id === s2.id : s1 === s2;
  }

  /**
   * Handles the save action.
   * Emits the form data if the form is valid.
   */
  save(): void {
    if (this.form.valid) {
      this.saved = true
      this.statusUpdated.emit(this.form.value);
      if (this.isFromOpenDialog()) {
        this.close()
      }
    }
  }

  /**
   * Handles the cancel action.
   * Emits the cancelled event.
   */
  cancel(): void {
    this.cancelled.emit();
    if (this.isFromOpenDialog()) {
      this.close()
    }
  }

  close() {
    this.dialog.close()
  }
}