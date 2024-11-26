import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Contact } from '../models/contact.model';
import { AsyncPipe, CommonModule } from '@angular/common';
import {FormControl,FormGroup,FormsModule,ReactiveFormsModule,Validators,} from '@angular/forms';
import { environment } from '../environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HttpClientModule,
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  http = inject(HttpClient);
  apiUrl = environment.apiUrl;

  // Pagination properties
  pageSize = 6;
  currentPage = 1;
  totalPages = 1;
  paginatedContacts: Contact[] = [];

  // Sorting properties
  sortField: keyof Pick<Contact, 'name' | 'email'> = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Define the form controls with validation rules
  contactsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/),]),
    jobTitle: new FormControl('',[Validators.required]),
    salary: new FormControl('', [Validators.required,Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)]), // For numeric salary
    department: new FormControl('', [Validators.required]),
  });

  // Define the observable for contacts and the filtered contacts
  contacts$: Observable<Contact[]> = this.getContacts();
  filteredContacts$ = new BehaviorSubject<Contact[]>([]);
  contactToEdit: Contact | null = null;
  searchTerm = '';

  constructor() {
    this.contacts$.subscribe((contacts) => {
      this.filteredContacts$.next(contacts);
      this.updatePagination();
    });
  }

  onFormSubmit() {
    const contactData = this.contactsForm.value;
    if (this.contactToEdit) {
      const updateContactRequest = {
        id: this.contactToEdit.id,
        ...contactData,
      };
      this.http
        .put(`${this.apiUrl}/${this.contactToEdit.id}`, updateContactRequest)
        .subscribe(() => this.refreshContacts());
    } else {
      this.http
        .post(this.apiUrl, contactData)
        .subscribe(() => this.refreshContacts());
    }
    this.contactsForm.reset();
    this.contactToEdit = null;
  }

  //Delete employee
  onDelete(id: string) {
    const confirmed = confirm('Are you sure you want to delete this contact?');
    if (confirmed) {
      this.http
        .delete(`${this.apiUrl}/${id}`)
        .subscribe(() => this.refreshContacts());
    }
  }

  onEdit(contact: Contact) {
    this.contactToEdit = contact;
    this.contactsForm.patchValue(contact);
  }

  onSearch() {
    const searchTermLower = this.searchTerm.toLowerCase();
    this.contacts$
      .pipe(
        map((contacts) =>
          contacts.filter(
            (contact) =>
              contact.name.toLowerCase().includes(searchTermLower) ||
              (contact.email &&
                contact.email.toLowerCase().includes(searchTermLower)) ||
              contact.phone.toLowerCase().includes(searchTermLower) ||
              contact.department.toLowerCase().includes(searchTermLower)
          )
        )
      )
      .subscribe((filteredContacts) => {
        this.filteredContacts$.next(filteredContacts);
        this.updatePagination();
      });
  }

  // Sorting logic
  sortContacts(field: keyof Pick<Contact, 'name' | 'email'>) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.filteredContacts$.next(
      this.sortArray([...this.filteredContacts$.getValue()])
    );
    this.updatePagination();
  }

  sortArray(array: Contact[]): Contact[] {
    return array.sort((a, b) => {
      const fieldA = a[this.sortField]?.toString().toLowerCase() || '';
      const fieldB = b[this.sortField]?.toString().toLowerCase() || '';

      if (fieldA < fieldB) return this.sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination methods
  updatePagination() {
    this.filteredContacts$.subscribe((contacts) => {
      this.totalPages = Math.ceil(contacts.length / this.pageSize);
      this.updatePaginatedContacts();
    });
  }

  updatePaginatedContacts() {
    this.filteredContacts$.subscribe((contacts) => {
      const start = (this.currentPage - 1) * this.pageSize;
      this.paginatedContacts = contacts.slice(start, start + this.pageSize);
    });
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedContacts();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedContacts();
    }
  }

  getContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.apiUrl);
  }

  clearSearch() {
    this.searchTerm = '';
    this.onSearch(); // Optionally re-run search to reset the displayed results
  }

  refreshContacts() {
    this.getContacts().subscribe((contacts) => {
      this.filteredContacts$.next(this.sortArray(contacts));
      this.updatePagination();
    });
  }
}
