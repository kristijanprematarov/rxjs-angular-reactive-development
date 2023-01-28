import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Supplier} from 'src/app/suppliers/supplier';

import {ProductService} from '../product.service';
import {catchError, combineLatest, EMPTY, filter, map, Subject} from "rxjs";

@Component({
  selector: 'pm-product-detail',
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailComponent {
  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();
  productSuppliers: Supplier[] | null = null;

  productSuppliers$ = this.productService.selectedProductSuppliers$
    .pipe(
      catchError(err => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    )

  product$ = this.productService.selectedProduct$
    .pipe(
      catchError(err => {
        this.errorMessageSubject.next(err);
        return EMPTY;
      })
    )

  pageTitle$ = this.product$
    .pipe(
      map(product => product ? `Product Detail for: ${product.productName}` : null)
    )

  viewModel$ = combineLatest([
    this.product$,
    this.productSuppliers$,
    this.pageTitle$
  ]).pipe(
    filter(([product]) => Boolean(product)),
    map(([product, productSuppliers, pageTitle]) => ({product, productSuppliers, pageTitle}))
  )

  constructor(private productService: ProductService) {
  }

}
