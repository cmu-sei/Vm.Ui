import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Machine } from '../../../models/machine';

@Component({
  selector: 'app-add-point',
  templateUrl: './add-point.component.html',
  styleUrls: ['./add-point.component.css']
})
export class AddPointComponent implements OnInit {
  @Input() xPos: number;
  @Input() yPos: number;
  @Input() rad: number;
  @Input() url: string;

  @Output() machineEmitter = new EventEmitter<Machine>();
  form: FormGroup;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit(): void {
    // Default values come from map component
    this.form = this.formBuilder.group({
      x: [this.xPos],
      y: [this.yPos],
      rad: [this.rad],
      url: [this.url],
    });
  }

  onSubmit(): void {
    console.log("form submitted");    

    this.machineEmitter.emit(new Machine(+this.form.get("x").value, +this.form.get("y").value,
      +this.form.get("rad").value, this.form.get("url").value));
  }
}
