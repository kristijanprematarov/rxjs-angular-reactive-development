import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  concatMap, filter, forkJoin,
  map,
  merge,
  Observable, of,
  scan, share, shareReplay,
  Subject, switchMap,
  tap,
  throwError
} from 'rxjs';

import {Product} from './product';
import {ProductCategoryService} from "../product-categories/product-category.service";
import {ProductCategory} from "../product-categories/product-category";
import {SupplierService} from "../suppliers/supplier.service";
import {Supplier} from "../suppliers/supplier";

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = 'api/suppliers';

  private refresh = new BehaviorSubject<void>(undefined);

  products$ = this.http.get<Product[]>(this.productsUrl)
    .pipe(
      tap(data => console.log('Products: ', JSON.stringify(data))),
      catchError(this.handleError)
    );

  productsWithCategory$ = combineLatest([this.products$, this.productCategoryService.productCategories$])
    .pipe(
      map(([products, categories]) => {
        return products.map(product => {
          return {
            ...product,
            price: product.price ? product.price * 1.5 : 0,
            searchKey: [product.productName],
            categoryName: categories.find(c => c.id === product.categoryId)?.name
          } as Product;
        })
      }),
      shareReplay(1)
    )

  private productSelectedSubject = new BehaviorSubject<number>(0);
  productSelectedAction$ = this.productSelectedSubject.asObservable();

  // selectedProduct$ = this.productsWithCategory$
  //   .pipe(
  //     map(products => products.find(product => product.id === 5)),
  //     tap(product => console.log(product))
  //   )

  selectedProduct$ = combineLatest([this.productsWithCategory$, this.productSelectedAction$])
    .pipe(
      map(([products, selectedProductId]) => products.find(product => product.id === selectedProductId)),
      tap(product => console.log('SELECTED PRODUCT:', product)),
      shareReplay(1)
    )

  // selectedProductSuppliers$ = combineLatest([
  //   this.selectedProduct$,
  //   this.supplierService.suppliers$
  // ]).pipe(
  //   map(([selectedProduct, suppliers]) => {
  //     return suppliers.filter(s => selectedProduct?.supplierIds?.includes(s.id))
  //   })
  // );

  selectedProductSuppliers$ = this.selectedProduct$
    .pipe(
      filter(product => Boolean(product)),
      switchMap(selectedProduct => {
        if (selectedProduct?.supplierIds) {
          return forkJoin(selectedProduct.supplierIds.map(supplierId => {
            return this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)
          }));
        } else {
          return of([])
        }
      }),
    )

  private productInsertedSubject = new Subject<Product>();
  productInsertedAction$ = this.productInsertedSubject.asObservable();

  productsWithAdd$ = merge(
    this.productsWithCategory$,
    this.productInsertedAction$
    // .pipe(
    //   concatMap(newProduct => {
    //     return this.http.post<Product>(this.productsUrl, newProduct);
    //   })
    // )
  )
    .pipe(
      scan((productsArray, value) =>
        (value instanceof Array) ? [...value] : [...productsArray, value], [] as Product[])
    )

  constructor(private http: HttpClient,
              private productCategoryService: ProductCategoryService,
              private supplierService: SupplierService) {
  }

  addProduct(newProduct?: Product) {
    newProduct = newProduct || this.fakeProduct();
    this.productInsertedSubject.next(newProduct);
  }

  selectedProductChanged(selectedProductId: number): void {
    this.productSelectedSubject.next(selectedProductId);
  }

  private fakeProduct(): Product {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      // category: 'Toolbox',
      quantityInStock: 30
    };
  }

  private getCategory(price: number | undefined) {
    return "";
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.message}`;
    }
    console.error(err);
    return throwError(() => errorMessage);
  }
}
