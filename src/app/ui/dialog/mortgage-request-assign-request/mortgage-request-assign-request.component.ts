// src/app/components/assign-operator-dialog/assign-operator-dialog.component.ts

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { remult } from 'remult'; // For fetching operators
import { MortgageRequest } from '../../../../shared/entity/request.entity';
import { User } from '../../../../shared/entity/user.entity';

@Component({
  selector: 'app-mortgage-request-assign-request',
  templateUrl: './mortgage-request-assign-request.component.html',
  styleUrl: './mortgage-request-assign-request.component.scss'
})
export class MortgageRequestAssignRequestComponent implements OnInit {

  // This is how the dialog component receives data when opened via MatDialog.open
  // It matches the structure used in mortgage-request-update-status.component.ts
  args: { request: MortgageRequest } = { request: undefined! };

  saved = false
  // --- Inputs & Outputs ---

  /**
   * The mortgage request object to which an operator will be assigned.
   * This is provided by the parent component or via `args` when opened as a dialog.
   */
  @Input() request!: MortgageRequest;

  /**
   * Emits the updated MortgageRequest object when the user clicks 'Save'.
   * The parent component will listen to this event and save the changes.
   */
  @Output() operatorAssigned = new EventEmitter<MortgageRequest>();

  /**
   * Emits when the user clicks 'Cancel'.
   */
  @Output() cancelled = new EventEmitter<void>();

  // --- Properties ---
  form!: FormGroup;
  operators = [] as User[]; // List of available operators

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<MortgageRequestAssignRequestComponent>) { }

  // Helper to check if the component is opened as a dialog
  isFromOpenDialog = () => !!this.args?.request;

  async ngOnInit(): Promise<void> {
    // If opened as a dialog, transfer args.request to the @Input request property
    if (this.args && this.args.request) {
      this.request = this.args.request;
    }

    if (!this.request) {
      console.error("AssignOperatorDialogComponent requires a 'request' input.");
      // Potentially close the dialog or handle this error gracefully
      this.close();
      return;
    }

    // Fetch operators (users with the 'operator' role)
    try {
      const userRepo = remult.repo(User); //
      this.operators = await userRepo.find({
        where: {
          disabled: false,
          operator: true // Filter for users who are operators
        },
        orderBy: { name: "asc" }
      });
      console.log('Fetched operators:', this.operators);
    } catch (error) {
      console.error("Error fetching operators:", error);
      // Handle error, maybe show a message to the user
      this.operators = [];
    }

    // Initialize the form
    this.form = this.fb.group({
      // Set the initial value to the currently assigned operator, if any
      operator: [this.request.assignedOperator || null, Validators.required]
    });
  }

  /**
   * Compares two User objects to determine if they are the same (for dropdown selection).
   * Angular uses this function to set the initial selected value in the dropdown.
   */
  compareOperators(o1: User | null, o2: User | null): boolean {
    // Return true if both objects exist and their IDs are the same.
    // The 'o1 === o2' part handles cases where one or both are null/undefined.
    return o1 && o2 ? o1.id === o2.id : o1 === o2; //
  }

  /**
   * Handles the save action.
   * Updates the request object and emits it.
   */
  save(): void {
    if (this.form.valid) {
      this.saved = true
      const selectedOperator: User | null = this.form.get('operator')?.value; //

      // Update the request object with the new operator information
      this.request.assignedOperatorId = selectedOperator ? selectedOperator.id : undefined; //
      this.request.assignedOperator = selectedOperator || undefined; //

      this.operatorAssigned.emit(this.request); // Emit the updated request

      if (this.isFromOpenDialog()) {
        this.close(this.request); // Close the dialog, optionally passing the result back
      }
    }
    else alert('NOT VALID')
  }

  /**
   * Handles the cancel action.
   * Emits the cancelled event and closes the dialog.
   */
  cancel(): void {
    this.cancelled.emit();
    if (this.isFromOpenDialog()) {
      this.close(); // Close the dialog without a result
    }
  }

  /**
   * Closes the dialog, optionally passing data back.
   * @param result The data to pass back to the component that opened the dialog.
   */
  close(result?: MortgageRequest): void {
    this.dialogRef.close(result);
  }
}
